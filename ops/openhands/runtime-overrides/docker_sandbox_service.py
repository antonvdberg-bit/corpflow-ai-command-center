import asyncio
import logging
import os
import socket
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import AsyncGenerator

import base62
import docker
import httpx
from docker.errors import APIError, NotFound
from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field

from openhands.agent_server.utils import utc_now
from openhands.app_server.errors import SandboxError
from openhands.app_server.sandbox.docker_sandbox_spec_service import get_docker_client
from openhands.app_server.sandbox.sandbox_models import (
    AGENT_SERVER,
    VSCODE,
    WORKER_1,
    WORKER_2,
    ExposedUrl,
    SandboxInfo,
    SandboxPage,
    SandboxRecord,
    SandboxStatus,
)
from openhands.app_server.sandbox.sandbox_service import (
    SESSION_API_KEY_VARIABLE,
    WEBHOOK_CALLBACK_VARIABLE,
    SandboxService,
    SandboxServiceInjector,
)
from openhands.app_server.sandbox.sandbox_spec_service import SandboxSpecService
from openhands.app_server.services.injector import InjectorState
# CORPFLOWAI: replace_localhost_hostname_for_docker intentionally NOT used —
# it rewrites health URLs to host.docker.internal (forbidden).

_logger = logging.getLogger(__name__)
# CORPFLOWAI: upstream default 15s is too short for agent-server cold start on
# corpflow-exec-01 (observed ~30s). Prefer SANDBOX_STARTUP_GRACE_SECONDS env
# (read by config.py into injector kwargs); this constant is the dataclass fallback.
STARTUP_GRACE_SECONDS = int(os.getenv('SANDBOX_STARTUP_GRACE_SECONDS', '120'))

# ---------------------------------------------------------------------------
# CORPFLOWAI BOUNDARY OVERRIDE (OpenHands app 1.8 / SDK Docker path)
# Source: upstream openhands:1.8
#   /app/openhands/app_server/sandbox/docker_sandbox_service.py
# Reason: upstream hardcodes ExtraHosts host.docker.internal:host-gateway and
# attaches dynamically spawned agent-server containers to the daemon default
# bridge with published host ports. That violates CorpFlowAI package policy
# (corpflowai-openhands-net only, ExtraHosts=[], no host-gateway, no published
# sandbox ports). This file is bind-mounted over the upstream module by
# ops/openhands/compose.yaml. Prefer deleting this override if a future
# upstream release gains first-class named-network + empty-ExtraHosts support.
# Controlling issue: #743 / remediation on PR #747.
# ---------------------------------------------------------------------------
CORPFLOWAI_SANDBOX_NETWORK = os.getenv(
    'CORPFLOWAI_SANDBOX_NETWORK', 'corpflowai-openhands-net'
)
CORPFLOWAI_SANDBOX_WEBHOOK_BASE = os.getenv(
    'CORPFLOWAI_SANDBOX_WEBHOOK_BASE', 'http://corpflowai-openhands-app:3000'
)
CORPFLOWAI_SANDBOX_MEM_LIMIT = os.getenv('CORPFLOWAI_SANDBOX_MEM_LIMIT', '512m')
CORPFLOWAI_SANDBOX_NANO_CPUS = int(
    os.getenv('CORPFLOWAI_SANDBOX_NANO_CPUS', str(500_000_000))
)  # 0.5 CPU
CORPFLOWAI_SANDBOX_PIDS_LIMIT = int(os.getenv('CORPFLOWAI_SANDBOX_PIDS_LIMIT', '256'))


def _get_use_host_network_default() -> bool:
    """Get the default value for use_host_network from environment variables.

    This function is called at runtime (not at class definition time) to ensure
    that environment variable changes are picked up correctly.
    """
    value = os.getenv('AGENT_SERVER_USE_HOST_NETWORK', '')
    return value.lower() in ('true', '1', 'yes')


def _get_kvm_enabled_default() -> bool:
    """Get the default value for kvm_enabled from environment variables."""
    value = os.getenv('SANDBOX_KVM_ENABLED', '')
    return value.lower() in ('true', '1', 'yes')


class VolumeMount(BaseModel):
    """Mounted volume within the container."""

    host_path: str
    container_path: str
    mode: str = 'rw'

    model_config = ConfigDict(frozen=True)


class ExposedPort(BaseModel):
    """Exposed port within container to be matched to a free port on the host."""

    name: str
    description: str
    container_port: int = 8000

    model_config = ConfigDict(frozen=True)


@dataclass
class DockerSandboxService(SandboxService):
    """Sandbox service built on docker.

    The Docker API does not currently support async operations, so some of these operations will block.
    Given that the docker API is intended for local use on a single machine, this is probably acceptable.
    """

    sandbox_spec_service: SandboxSpecService
    container_name_prefix: str
    host_port: int
    container_url_pattern: str
    mounts: list[VolumeMount]
    exposed_ports: list[ExposedPort]
    health_check_path: str | None
    httpx_client: httpx.AsyncClient
    max_num_sandboxes: int
    web_url: str | None = None
    permitted_cors_origins: list[str] = field(default_factory=list)
    extra_hosts: dict[str, str] = field(default_factory=dict)
    docker_client: docker.DockerClient = field(default_factory=get_docker_client)
    startup_grace_seconds: int = STARTUP_GRACE_SECONDS
    use_host_network: bool = False
    kvm_enabled: bool = False

    def _find_unused_port(self) -> int:
        """Find an unused port on the host machine."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def _docker_status_to_sandbox_status(self, docker_status: str) -> SandboxStatus:
        """Convert Docker container status to SandboxStatus."""
        status_mapping = {
            'running': SandboxStatus.RUNNING,
            'paused': SandboxStatus.PAUSED,
            # The stop button was pressed in the docker console
            'exited': SandboxStatus.PAUSED,
            'created': SandboxStatus.STARTING,
            'restarting': SandboxStatus.STARTING,
            'removing': SandboxStatus.MISSING,
            'dead': SandboxStatus.ERROR,
        }
        return status_mapping.get(docker_status.lower(), SandboxStatus.ERROR)

    def _get_container_env_vars(self, container) -> dict[str, str | None]:
        env_vars_list = container.attrs['Config']['Env']
        result = {}
        for env_var in env_vars_list:
            if '=' in env_var:
                key, value = env_var.split('=', 1)
                result[key] = value
            else:
                # Handle cases where an environment variable might not have a value
                result[env_var] = None
        return result

    async def _container_to_sandbox_info(self, container) -> SandboxInfo | None:
        """Convert Docker container to SandboxInfo."""
        # Convert Docker status to runtime status
        status = self._docker_status_to_sandbox_status(container.status)

        # Parse creation time
        created_str = container.attrs.get('Created', '')
        try:
            created_at = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            created_at = utc_now()

        # Get URL and session key for running containers
        exposed_urls = None
        session_api_key = None

        if status == SandboxStatus.RUNNING:
            # Get session API key first
            env = self._get_container_env_vars(container)
            session_api_key = env.get(SESSION_API_KEY_VARIABLE)

            # Get the exposed port mappings
            exposed_urls = []

            # Check if container is using host network mode
            network_mode = container.attrs.get('HostConfig', {}).get('NetworkMode', '')
            is_host_network = network_mode == 'host'

            if is_host_network:
                raise SandboxError(
                    'CORPFLOWAI boundary: sandbox with NetworkMode=host is forbidden'
                )

            # CORPFLOWAI: preferred path — named dedicated network, no host
            # port bindings. Reach agent-server via Docker DNS on container port.
            networks = (
                container.attrs.get('NetworkSettings', {}).get('Networks', {}) or {}
            )
            on_corpflow_net = CORPFLOWAI_SANDBOX_NETWORK in networks
            port_bindings = container.attrs.get('NetworkSettings', {}).get('Ports', {})
            has_host_bindings = any(
                bool(bindings) for bindings in (port_bindings or {}).values()
            )

            if on_corpflow_net and not has_host_bindings:
                for exposed_port in self.exposed_ports:
                    url = f'http://{container.name}:{exposed_port.container_port}'
                    if exposed_port.name == VSCODE:
                        url += (
                            f'/?tkn={session_api_key}'
                            f'&folder={container.attrs["Config"]["WorkingDir"]}'
                        )
                    exposed_urls.append(
                        ExposedUrl(
                            name=exposed_port.name,
                            url=url,
                            port=exposed_port.container_port,
                        )
                    )
            else:
                # Legacy bridge + published ports — CORPFLOWAI treats this as a
                # boundary failure for newly spawned sandboxes; keep read path
                # for inspecting pre-remediation containers only.
                _logger.warning(
                    'CORPFLOWAI: sandbox %s not on dedicated net without host '
                    'bindings (network_mode=%s networks=%s) — using legacy port map',
                    container.name,
                    network_mode,
                    list(networks.keys()),
                )
                if port_bindings:
                    for container_port, host_bindings in port_bindings.items():
                        if host_bindings:
                            host_port = int(host_bindings[0]['HostPort'])
                            matching_port = next(
                                (
                                    ep
                                    for ep in self.exposed_ports
                                    if container_port == f'{ep.container_port}/tcp'
                                ),
                                None,
                            )
                            if matching_port:
                                url = self.container_url_pattern.format(port=host_port)

                                # VSCode URLs require the api_key and working dir
                                if matching_port.name == VSCODE:
                                    url += f'/?tkn={session_api_key}&folder={container.attrs["Config"]["WorkingDir"]}'

                                exposed_urls.append(
                                    ExposedUrl(
                                        name=matching_port.name,
                                        url=url,
                                        port=matching_port.container_port,
                                    )
                                )

        if not container.image.tags:
            _logger.debug(
                f'Skipping container {container.name!r}: image has no tags (image id: {container.image.id})'
            )
            return None

        return SandboxInfo(
            id=container.name,
            created_by_user_id=None,
            sandbox_spec_id=container.image.tags[0],
            status=status,
            session_api_key=session_api_key,
            exposed_urls=exposed_urls,
            created_at=created_at,
        )

    async def _container_to_checked_sandbox_info(self, container) -> SandboxInfo | None:
        sandbox_info = await self._container_to_sandbox_info(container)
        if (
            sandbox_info
            and self.health_check_path is not None
            and sandbox_info.exposed_urls
        ):
            app_server_url = next(
                exposed_url.url
                for exposed_url in sandbox_info.exposed_urls
                if exposed_url.name == AGENT_SERVER
            )
            try:
                # CORPFLOWAI: URLs are already http://{container}:{port} on the
                # dedicated network. Do NOT rewrite to host.docker.internal.
                if 'host.docker.internal' in app_server_url:
                    raise SandboxError(
                        'CORPFLOWAI boundary: sandbox health URL must not use '
                        'host.docker.internal'
                    )
                if 'localhost' in app_server_url or '127.0.0.1' in app_server_url:
                    # Defensive: only rewrite if somehow still localhost — but
                    # never to host-gateway; keep as-is and fail closed later.
                    _logger.warning(
                        'CORPFLOWAI: unexpected localhost health URL %s',
                        app_server_url,
                    )
                else:
                    # skip replace_localhost_hostname_for_docker
                    pass

                response = await self.httpx_client.get(
                    f'{app_server_url}{self.health_check_path}'
                )
                response.raise_for_status()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Get the started_at from the docker container info and fallback to sandbox created_at
                try:
                    state = container.attrs['State']
                    started_at = datetime.fromisoformat(state['StartedAt'])
                except Exception:
                    _logger.debug('Error getting container start time')
                    started_at = sandbox_info.created_at

                # If the server has exceeded the startup grace period, it's an error
                if started_at < utc_now() - timedelta(
                    seconds=self.startup_grace_seconds
                ):
                    _logger.info(
                        f'Sandbox server not running: {app_server_url} : {exc}'
                    )
                    sandbox_info.status = SandboxStatus.ERROR
                else:
                    _logger.debug(
                        f'Sandbox server not yet available (still starting): '
                        f'{app_server_url} : {exc}'
                    )
                    sandbox_info.status = SandboxStatus.STARTING
                sandbox_info.exposed_urls = None
                sandbox_info.session_api_key = None
        return sandbox_info

    async def search_sandboxes(
        self,
        page_id: str | None = None,
        limit: int = 100,
    ) -> SandboxPage:
        """Search for sandboxes."""
        try:
            # Get all containers with our prefix
            all_containers = self.docker_client.containers.list(all=True)
            sandboxes = []

            for container in all_containers:
                if container.name and container.name.startswith(
                    self.container_name_prefix
                ):
                    sandbox_info = await self._container_to_checked_sandbox_info(
                        container
                    )
                    if sandbox_info:
                        sandboxes.append(sandbox_info)

            # Sort by creation time (newest first)
            sandboxes.sort(key=lambda x: x.created_at, reverse=True)

            # Apply pagination
            start_idx = 0
            if page_id:
                try:
                    start_idx = int(page_id)
                except ValueError:
                    start_idx = 0

            end_idx = start_idx + limit
            paginated_containers = sandboxes[start_idx:end_idx]

            # Determine next page ID
            next_page_id = None
            if end_idx < len(sandboxes):
                next_page_id = str(end_idx)

            return SandboxPage(items=paginated_containers, next_page_id=next_page_id)

        except APIError:
            return SandboxPage(items=[], next_page_id=None)

    async def get_sandbox(self, sandbox_id: str) -> SandboxInfo | None:
        """Get a single sandbox info."""
        try:
            if not sandbox_id.startswith(self.container_name_prefix):
                return None
            container = self.docker_client.containers.get(sandbox_id)
            return await self._container_to_checked_sandbox_info(container)
        except (NotFound, APIError):
            return None

    async def get_sandbox_by_session_api_key(
        self, session_api_key: str
    ) -> SandboxInfo | None:
        """Get a single sandbox by session API key."""
        try:
            # Get all containers with our prefix
            all_containers = self.docker_client.containers.list(all=True)

            for container in all_containers:
                if container.name and container.name.startswith(
                    self.container_name_prefix
                ):
                    # Check if this container has the matching session API key
                    env_vars = self._get_container_env_vars(container)
                    container_session_key = env_vars.get(SESSION_API_KEY_VARIABLE)

                    if container_session_key == session_api_key:
                        return await self._container_to_checked_sandbox_info(container)

            return None
        except (NotFound, APIError):
            return None

    async def get_sandbox_record_by_session_api_key(
        self, session_api_key: str
    ) -> SandboxRecord | None:
        """Get persisted sandbox identity by session API key."""
        try:
            all_containers = self.docker_client.containers.list(all=True)
            for container in all_containers:
                if container.name and container.name.startswith(
                    self.container_name_prefix
                ):
                    env_vars = self._get_container_env_vars(container)
                    if env_vars.get(SESSION_API_KEY_VARIABLE) == session_api_key:
                        return SandboxRecord(
                            id=container.name,
                            created_by_user_id=None,
                        )
            return None
        except (NotFound, APIError):
            return None

    async def start_sandbox(
        self, sandbox_spec_id: str | None = None, sandbox_id: str | None = None
    ) -> SandboxInfo:
        """Start a new sandbox."""
        # Warn about port collision risk when using host network mode with multiple sandboxes
        if self.use_host_network and self.max_num_sandboxes > 1:
            _logger.warning(
                'Host network mode is enabled with max_num_sandboxes > 1. '
                'Multiple sandboxes will attempt to bind to the same ports, '
                'which may cause port collision errors. Consider setting '
                'max_num_sandboxes=1 when using host network mode.'
            )

        # CORPFLOWAI concurrency=1: pause every currently RUNNING sandbox before
        # starting a new one. Upstream `pause_old_sandboxes(max_num_sandboxes - 1)`
        # raises ValueError when max_num_sandboxes == 1 (keep=0 is rejected).
        page = await self.search_sandboxes(limit=100)
        for existing in page.items:
            if existing.status == SandboxStatus.RUNNING:
                _logger.info(
                    'CORPFLOWAI pausing prior sandbox %s before start (concurrency=1)',
                    existing.id,
                )
                await self.pause_sandbox(existing.id)

        if sandbox_spec_id is None:
            sandbox_spec = await self.sandbox_spec_service.get_default_sandbox_spec()
        else:
            sandbox_spec_maybe = await self.sandbox_spec_service.get_sandbox_spec(
                sandbox_spec_id
            )
            if sandbox_spec_maybe is None:
                raise ValueError('Sandbox Spec not found')
            sandbox_spec = sandbox_spec_maybe

        # Generate a sandbox id if none was provided
        if sandbox_id is None:
            sandbox_id = base62.encodebytes(os.urandom(16))

        # Generate container name and session api key
        container_name = f'{self.container_name_prefix}{sandbox_id}'
        session_api_key = base62.encodebytes(os.urandom(32))

        # Prepare environment variables
        env_vars = sandbox_spec.initial_env.copy()
        env_vars[SESSION_API_KEY_VARIABLE] = session_api_key
        # CORPFLOWAI: callback over dedicated Docker DNS — never host.docker.internal.
        if self.use_host_network:
            raise SandboxError(
                'CORPFLOWAI boundary: host networking for sandboxes is forbidden'
            )
        env_vars[WEBHOOK_CALLBACK_VARIABLE] = (
            f'{CORPFLOWAI_SANDBOX_WEBHOOK_BASE.rstrip("/")}/api/v1/webhooks'
        )

        # Set CORS origins for remote browser access when web_url is configured.
        # This allows the agent-server container to accept requests from the
        # frontend when running OpenHands on a remote machine.
        # Each origin gets its own indexed env var (OH_ALLOW_CORS_ORIGINS_0, _1, etc.)
        cors_origins: list[str] = []
        if self.web_url:
            cors_origins.append(self.web_url)
        cors_origins.extend(self.permitted_cors_origins)
        # Deduplicate while preserving order
        seen: set[str] = set()
        for origin in cors_origins:
            if origin not in seen:
                seen.add(origin)
                idx = len(seen) - 1
                env_vars[f'OH_ALLOW_CORS_ORIGINS_{idx}'] = origin

        # CORPFLOWAI: no host-port publish. Agent-server ports stay container-local
        # and are reached via Docker DNS on CORPFLOWAI_SANDBOX_NETWORK.
        for exposed_port in self.exposed_ports:
            env_vars[exposed_port.name] = str(exposed_port.container_port)

        # Prepare labels
        labels = {
            'sandbox_spec_id': sandbox_spec.id,
            'corpflowai.sandbox_network': CORPFLOWAI_SANDBOX_NETWORK,
            'corpflowai.isolation': 'dedicated-net-no-host-gateway',
        }

        # Prepare volumes — only mounts explicitly configured (never docker.sock).
        for mount in self.mounts:
            if mount.host_path in (
                '/var/run/docker.sock',
                '/run/docker.sock',
            ) or mount.host_path.endswith('/docker.sock'):
                raise SandboxError(
                    'CORPFLOWAI boundary: docker.sock must not be mounted into sandboxes'
                )
        volumes = {
            mount.host_path: {
                'bind': mount.container_path,
                'mode': mount.mode,
            }
            for mount in self.mounts
        }

        # Determine devices to pass through (e.g., /dev/kvm for hardware virtualization)
        # CORPFLOWAI: KVM passthrough is not authorized for the private-worker pilot.
        if self.kvm_enabled:
            raise SandboxError(
                'CORPFLOWAI boundary: SANDBOX_KVM_ENABLED is not authorized'
            )
        devices = None

        _logger.info(
            'CORPFLOWAI starting sandbox %s on network=%s mem=%s nano_cpus=%s pids=%s',
            container_name,
            CORPFLOWAI_SANDBOX_NETWORK,
            CORPFLOWAI_SANDBOX_MEM_LIMIT,
            CORPFLOWAI_SANDBOX_NANO_CPUS,
            CORPFLOWAI_SANDBOX_PIDS_LIMIT,
        )

        try:
            # Create and start the container — dedicated named network only.
            # network= attaches to corpflowai-openhands-net (NetworkMode becomes
            # that name). ports=None → no published host ports. extra_hosts omitted
            # → ExtraHosts=[]. Resource limits are HostConfig-enforced.
            container = self.docker_client.containers.run(  # type: ignore[call-overload,misc]
                image=sandbox_spec.id,
                command=sandbox_spec.command,  # Use default command from image
                remove=False,
                name=container_name,
                environment=env_vars,
                ports=None,
                volumes=volumes if volumes else None,
                working_dir=sandbox_spec.working_dir,
                labels=labels,
                detach=True,
                init=True,
                extra_hosts=None,
                network=CORPFLOWAI_SANDBOX_NETWORK,
                mem_limit=CORPFLOWAI_SANDBOX_MEM_LIMIT,
                nano_cpus=CORPFLOWAI_SANDBOX_NANO_CPUS,
                pids_limit=CORPFLOWAI_SANDBOX_PIDS_LIMIT,
                devices=devices,
            )

            sandbox_info = await self._container_to_sandbox_info(container)
            assert sandbox_info is not None
            return sandbox_info

        except APIError as e:
            raise SandboxError(f'Failed to start container: {e}')

    async def resume_sandbox(self, sandbox_id: str) -> bool:
        """Resume a paused sandbox."""
        # CORPFLOWAI concurrency=1 — pause others before resume.
        page = await self.search_sandboxes(limit=100)
        for existing in page.items:
            if existing.status == SandboxStatus.RUNNING and existing.id != sandbox_id:
                await self.pause_sandbox(existing.id)

        try:
            if not sandbox_id.startswith(self.container_name_prefix):
                return False
            container = self.docker_client.containers.get(sandbox_id)

            if container.status == 'paused':
                container.unpause()
            elif container.status == 'exited':
                container.start()

            return True
        except (NotFound, APIError):
            return False

    async def pause_sandbox(self, sandbox_id: str) -> bool:
        """Pause a running sandbox."""
        try:
            if not sandbox_id.startswith(self.container_name_prefix):
                return False
            container = self.docker_client.containers.get(sandbox_id)

            if container.status == 'running':
                container.pause()

            return True
        except (NotFound, APIError):
            return False

    async def delete_sandbox(self, sandbox_id: str) -> bool:
        """Delete a sandbox."""
        try:
            if not sandbox_id.startswith(self.container_name_prefix):
                return False
            container = self.docker_client.containers.get(sandbox_id)

            # Stop the container if it's running
            if container.status in ['running', 'paused']:
                container.stop(timeout=10)

            # Remove the container
            container.remove()

            # Remove associated volume
            try:
                volume_name = f'openhands-workspace-{sandbox_id}'
                volume = self.docker_client.volumes.get(volume_name)
                volume.remove()
            except (NotFound, APIError):
                # Volume might not exist or already removed
                pass

            return True
        except (NotFound, APIError):
            return False


class DockerSandboxServiceInjector(SandboxServiceInjector):
    """Dependency injector for docker sandbox services."""

    container_url_pattern: str = Field(
        default='http://localhost:{port}',
        description=(
            'URL pattern for exposed sandbox ports. Use {port} as placeholder. '
            'For remote access, set to your server IP (e.g., http://192.168.1.100:{port}). '
            'Configure via OH_SANDBOX_CONTAINER_URL_PATTERN environment variable.'
        ),
    )
    host_port: int = Field(
        default=3000,
        description=(
            'The port on which the main OpenHands app server is running. '
            'Used for webhook callbacks from agent-server containers. '
            'If running OpenHands on a non-default port, set this to match. '
            'Configure via OH_SANDBOX_HOST_PORT environment variable.'
        ),
    )
    container_name_prefix: str = 'oh-agent-server-'
    max_num_sandboxes: int = Field(
        default=1,
        description=(
            'CORPFLOWAI: concurrency capped at 1 (upstream default was 5). '
            'Maximum number of sandboxes allowed to run simultaneously'
        ),
    )
    mounts: list[VolumeMount] = Field(default_factory=list)
    exposed_ports: list[ExposedPort] = Field(
        default_factory=lambda: [
            ExposedPort(
                name=AGENT_SERVER,
                description=(
                    'The port on which the agent server runs within the container'
                ),
                container_port=8000,
            ),
            ExposedPort(
                name=VSCODE,
                description=(
                    'The port on which the VSCode server runs within the container'
                ),
                container_port=8001,
            ),
            ExposedPort(
                name=WORKER_1,
                description=(
                    'The first port on which the agent should start application servers.'
                ),
                container_port=8011,
            ),
            ExposedPort(
                name=WORKER_2,
                description=(
                    'The second port on which the agent should start application servers.'
                ),
                container_port=8012,
            ),
        ]
    )
    health_check_path: str | None = Field(
        default='/health',
        description=(
            'The url path in the sandbox agent server to check to '
            'determine whether the server is running'
        ),
    )
    extra_hosts: dict[str, str] = Field(
        default_factory=dict,
        description=(
            'CORPFLOWAI: ExtraHosts must stay empty. Upstream default was '
            '{"host.docker.internal": "host-gateway"}; that is forbidden here. '
            'Sandbox↔control-plane uses Docker DNS on corpflowai-openhands-net.'
        ),
    )
    startup_grace_seconds: int = Field(
        default=STARTUP_GRACE_SECONDS,
        description=(
            'Number of seconds were no response from the agent server is acceptable'
            'before it is considered an error'
        ),
    )
    use_host_network: bool = Field(
        default_factory=_get_use_host_network_default,
        description=(
            'Whether to use host networking mode for agent-server containers. '
            'When enabled, containers share the host network namespace, '
            'making all container ports directly accessible on the host. '
            'This is useful for reverse proxy setups where dynamic port mapping '
            'is problematic. Configure via AGENT_SERVER_USE_HOST_NETWORK environment variable.'
        ),
    )
    kvm_enabled: bool = Field(
        default_factory=_get_kvm_enabled_default,
        description=(
            'Whether to pass through /dev/kvm to sandbox containers for hardware '
            'virtualization support. When enabled, sandboxes can run KVM-accelerated '
            'virtual machines instead of using slower emulation. Requires the host '
            'to have KVM available (/dev/kvm must exist and be accessible). '
            'Configure via SANDBOX_KVM_ENABLED environment variable.'
        ),
    )

    async def inject(
        self, state: InjectorState, request: Request | None = None
    ) -> AsyncGenerator[SandboxService, None]:
        # Define inline to prevent circular lookup
        from openhands.app_server.config import (
            get_global_config,
            get_httpx_client,
            get_sandbox_spec_service,
        )

        # Get web_url and permitted_cors_origins from global config
        config = get_global_config()
        web_url = config.web_url

        async with (
            get_httpx_client(state) as httpx_client,
            get_sandbox_spec_service(state) as sandbox_spec_service,
        ):
            yield DockerSandboxService(
                sandbox_spec_service=sandbox_spec_service,
                container_name_prefix=self.container_name_prefix,
                host_port=self.host_port,
                container_url_pattern=self.container_url_pattern,
                mounts=self.mounts,
                exposed_ports=self.exposed_ports,
                health_check_path=self.health_check_path,
                httpx_client=httpx_client,
                max_num_sandboxes=self.max_num_sandboxes,
                web_url=web_url,
                permitted_cors_origins=config.permitted_cors_origins,
                extra_hosts=self.extra_hosts,
                startup_grace_seconds=self.startup_grace_seconds,
                use_host_network=self.use_host_network,
                kvm_enabled=self.kvm_enabled,
            )
