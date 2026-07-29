declare const __YEMIND_SOURCE_BUILD_ID__: string | undefined;
declare const __YEMIND_SOURCE_BUILD_TIME__: string | undefined;

const fallbackTime = new Date().toISOString();

export const SOURCE_BUILD_INFO = Object.freeze({
  id: typeof __YEMIND_SOURCE_BUILD_ID__ === 'string'
    ? __YEMIND_SOURCE_BUILD_ID__
    : 'local',
  time: typeof __YEMIND_SOURCE_BUILD_TIME__ === 'string'
    ? __YEMIND_SOURCE_BUILD_TIME__
    : fallbackTime,
});
