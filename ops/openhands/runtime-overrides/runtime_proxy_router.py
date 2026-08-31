"""CorpFlowAI browser-to-agent proxy for OpenHands 1.8.

Keeps agent-server containers private on corpflowai-openhands-net while allowing
browser traffic to traverse the single loopback-bound OpenHands app port.
"""

import asyncio
import os
import re

import httpx
import websockets
from fastapi import APIRouter, HTTPException, Request, Response, WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketState
from websockets.exceptions import ConnectionClosed

from openhands.app_server.app_conversation.live_status_app_conversation_service import (
    LiveStatusAppConversationService,
)

router = APIRouter()

_AGENT_PORT = 8000
_SANDBOX_RE = re.compile(r'^oh-agent-server-[A-Za-z0-9]+$')
_BROWSER_BASE = os.getenv(
    'CORPFLOWAI_BROWSER_RUNTIME_PROXY_BASE', 'http://localhost:3000/runtime'
).rstrip('/')
_HOP_BY_HOP = {
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
}


def _validate_sandbox_id(sandbox_id: str) -> str:
    if not _SANDBOX_RE.fullmatch(sandbox_id):
        raise HTTPException(status_code=400, detail='Invalid sandbox id')
    return sandbox_id


def _target_http_url(sandbox_id: str, path: str, query: str = '') -> str:
    base = f'http://{sandbox_id}:{_AGENT_PORT}/{path.lstrip("/")}'
    if query:
        base += f'?{query}'
    return base


def _target_ws_url(sandbox_id: str, path: str, query: str = '') -> str:
    base = f'ws://{sandbox_id}:{_AGENT_PORT}/{path.lstrip("/")}'
    if query:
        base += f'?{query}'
    return base


def install_browser_conversation_url_patch() -> None:
    """Return proxy URLs to the browser without changing internal service URLs."""
    original = LiveStatusAppConversationService._build_conversation
    if getattr(original, '_corpflowai_runtime_proxy_patch', False):
        return

    def patched(self, app_conversation_info, sandbox, conversation_info):
        result = original(self, app_conversation_info, sandbox, conversation_info)
        if (
            result is not None
            and app_conversation_info is not None
            and sandbox is not None
            and sandbox.exposed_urls
        ):
            result.conversation_url = (
                f'{_BROWSER_BASE}/{sandbox.id}/api/conversations/'
                f'{app_conversation_info.id.hex}'
            )
        return result

    patched._corpflowai_runtime_proxy_patch = True
    LiveStatusAppConversationService._build_conversation = patched


@router.api_route(
    '/{sandbox_id}/{path:path}',
    methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
)
async def proxy_http(sandbox_id: str, path: str, request: Request) -> Response:
    sandbox_id = _validate_sandbox_id(sandbox_id)
    target = _target_http_url(sandbox_id, path, request.url.query)
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _HOP_BY_HOP and key.lower() != 'host'
    }
    body = await request.body()

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=False) as client:
        try:
            upstream = await client.request(
                request.method,
                target,
                headers=headers,
                content=body,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail='Agent server unavailable') from exc

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in _HOP_BY_HOP and key.lower() != 'content-length'
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )


@router.websocket('/{sandbox_id}/{path:path}')
async def proxy_websocket(sandbox_id: str, path: str, websocket: WebSocket) -> None:
    if not _SANDBOX_RE.fullmatch(sandbox_id):
        await websocket.accept()
        await websocket.close(code=1008, reason='Invalid sandbox id')
        return

    target = _target_ws_url(sandbox_id, path, websocket.url.query)

    try:
        async with websockets.connect(target) as upstream:
            await websocket.accept()

            async def client_to_upstream() -> None:
                try:
                    while True:
                        message = await websocket.receive()
                        if message.get('type') == 'websocket.disconnect':
                            break
                        if message.get('text') is not None:
                            await upstream.send(message['text'])
                        elif message.get('bytes') is not None:
                            await upstream.send(message['bytes'])
                except WebSocketDisconnect:
                    pass

            async def upstream_to_client() -> None:
                try:
                    async for message in upstream:
                        if websocket.client_state != WebSocketState.CONNECTED:
                            break
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            await websocket.send_text(message)
                except ConnectionClosed:
                    pass

            tasks = [
                asyncio.create_task(client_to_upstream()),
                asyncio.create_task(upstream_to_client()),
            ]
            done, pending = await asyncio.wait(
                tasks, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            await asyncio.gather(*done, *pending, return_exceptions=True)
    except Exception:
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011, reason='Agent server unavailable')
