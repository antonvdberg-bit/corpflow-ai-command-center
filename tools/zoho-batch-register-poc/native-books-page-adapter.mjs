const SOURCES = ['item', 'register', 'movement'];
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

function fail(message) {
  throw new TypeError(message);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function clone(value) {
  return structuredClone(value);
}

function safeClone(value, source, stage) {
  try {
    return clone(value);
  } catch {
    throw nativeFailure(source, stage);
  }
}

function safeIdentifier(value, name) {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) fail(`unsafe ${name}`);
  return value;
}

function validPage(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function sourceConfig(sources, source) {
  const config = sources?.[source];
  if (!config || typeof config.module !== 'string' || !config.module ||
      typeof config.recordsKey !== 'string' || !config.recordsKey ||
      typeof config.mapRecord !== 'function') {
    fail(`invalid ${source} source mapping`);
  }
  safeIdentifier(config.module, `${source} module`);
  return config;
}

function nativeFailure(source, stage) {
  return new TypeError(`native ${source} ${stage} failed`);
}

export function createNativeBooksPageTransport({ readPage, sources, orgId }) {
  if (typeof readPage !== 'function') fail('readPage is required');
  safeIdentifier(orgId, 'organization');
  const configs = Object.fromEntries(SOURCES.map((source) => [source, sourceConfig(sources, source)]));
  const state = new Map(SOURCES.map((source) => [source, { page: 1, cursor: undefined }]));

  return {
    async fetchPage(request) {
      if (!plainObject(request)) fail('page request must be an object');
      const { source, module, orgId: requestOrg, page, cursor } = request;
      if (!SOURCES.includes(source)) fail('unknown native source');
      const config = configs[source];
      if (module !== config.module) fail(`native ${source} module mismatch`);
      if (requestOrg !== orgId) fail(`native ${source} organization mismatch`);
      if (!validPage(page)) fail(`native ${source} page must be a positive safe integer`);
      const expected = state.get(source);
      if (page !== expected.page || cursor !== expected.cursor) {
        fail(`native ${source} page/cursor order mismatch`);
      }
      if (cursor !== undefined && (!validPage(cursor) || cursor !== page)) {
        fail(`native ${source} cursor mismatch`);
      }

      let receipt;
      try {
        receipt = await readPage({ module, orgId, page, ...(cursor === undefined ? {} : { cursor }) });
      } catch {
        throw nativeFailure(source, 'read');
      }
      if (!plainObject(receipt) || receipt.orgId !== orgId || receipt.module !== module ||
          receipt.page !== page || !plainObject(receipt.body)) {
        throw nativeFailure(source, 'receipt');
      }
      const body = receipt.body;
      if (body.code !== 0 || !Array.isArray(body[config.recordsKey]) ||
          !plainObject(body.page_context) || body.page_context.page !== page ||
          typeof body.page_context.has_more_page !== 'boolean') {
        throw nativeFailure(source, 'envelope');
      }
      const records = [];
      for (const nativeRecord of body[config.recordsKey]) {
        if (!plainObject(nativeRecord)) throw nativeFailure(source, 'record');
        const clonedRecord = safeClone(nativeRecord, source, 'mapping');
        let mapped;
        try {
          mapped = config.mapRecord(clonedRecord, { source, orgId, module, page });
        } catch {
          throw nativeFailure(source, 'mapping');
        }
        if (!plainObject(mapped) || mapped === clonedRecord) throw nativeFailure(source, 'mapping');
        records.push(safeClone(mapped, source, 'mapping'));
      }
      if (body.page_context.has_more_page) {
        if (page === Number.MAX_SAFE_INTEGER) throw nativeFailure(source, 'page increment');
        state.set(source, { page: page + 1, cursor: page + 1 });
        return { records, hasMore: true, nextCursor: page + 1 };
      }
      state.set(source, { page: Number.MAX_SAFE_INTEGER, cursor: Symbol('complete') });
      return { records, hasMore: false };
    },
  };
}
