/**
 * 餐车位置本地持久化与云端双轨同步验证脚本
 */

// -------------------------------------------------------------
// 环境打桩（使 safeStorage 与 truckLocationEngine 在 Node 下正常工作）
// -------------------------------------------------------------
const store = new Map<string, string>();

const localStorageStub = {
  get length() {
    return store.size;
  },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear()
};

const windowStub: any = {
  localStorage: localStorageStub,
  indexedDB: undefined,
  location: { hash: '' },
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined
};

(globalThis as any).window = windowStub;
(globalThis as any).localStorage = localStorageStub;

// 动态载入业务模块
const { getTruckInfo, saveTruckInfo } = await import('../src/utils/truckInfo.ts');
const {
  getAllTruckConfigs,
  saveTruckConfig,
  saveAllTruckConfigs,
  DEFAULT_TRUCK_CONFIGS
} = await import('../src/utils/truckLocationEngine.ts');
const {
  TCB_COLLECTIONS,
  getEnterpriseDataInventory,
  fetchTruckInfoFromCloud,
  fetchTruckLocationsFromCloud
} = await import('../src/utils/cloudbase.ts');

console.log('============ 餐车位置持久化与云端同步链路验证 ============');

let passCount = 0;
let failCount = 0;

function assert(description: string, condition: boolean, extra = '') {
  if (condition) {
    console.log(`PASS  ${description} ${extra ? `(${extra})` : ''}`);
    passCount++;
  } else {
    console.error(`FAIL  ${description} ${extra ? `(${extra})` : ''}`);
    failCount++;
  }
}

async function runTests() {
  // 1. 测试默认餐车坐标保底机制
  const initialTruck = getTruckInfo();
  assert(
    '默认餐车主信息包含有效经纬度坐标',
    typeof initialTruck.latitude === 'number' && typeof initialTruck.longitude === 'number',
    `lat: ${initialTruck.latitude}, lng: ${initialTruck.longitude}`
  );

  // 2. 测试车队位点引擎默认配置
  const allConfigs = getAllTruckConfigs();
  assert(
    '车队位点引擎初始化包含全部3辆餐车',
    allConfigs.length >= 3 && allConfigs.some(t => t.id === 'truck-01'),
    `count: ${allConfigs.length}`
  );

  // 3. 测试企业级云端资产清单 (Inventory) 包含 truck_locations
  const inventory = getEnterpriseDataInventory();
  const truckLocModule = inventory.find(it => it.key === 'truck_locations');
  assert(
    '全域数据清单注册了 truck_locations 模块',
    !!truckLocModule,
    `collection: ${truckLocModule?.collectionName}`
  );
  assert(
    'truck_locations 集合名映射正确',
    truckLocModule?.collectionName === TCB_COLLECTIONS.TRUCK_LOCATIONS,
    truckLocModule?.collectionName
  );
  assert(
    'truck_locations 存储键映射正确',
    truckLocModule?.storageKey === 'obsidian_truck_location_configs',
    truckLocModule?.storageKey
  );

  // 4. 测试修改餐车定位后的本地双轨持久化联动
  const testNewLocation = '静安大悦城北座 · 摩天轮下停靠点';
  const testLat = 31.2468;
  const testLng = 121.4725;
  const testRadius = 4.5;

  saveTruckConfig({
    id: 'truck-01',
    locationName: testNewLocation,
    latitude: testLat,
    longitude: testLng,
    deliveryRadiusKm: testRadius,
    status: 'open'
  });

  const reloadedConfigs = getAllTruckConfigs();
  const targetConfig = reloadedConfigs.find(t => t.id === 'truck-01');

  assert(
    'saveTruckConfig 成功持久化至 obsidian_truck_location_configs',
    targetConfig?.locationName === testNewLocation &&
    targetConfig?.latitude === testLat &&
    targetConfig?.longitude === testLng &&
    targetConfig?.deliveryRadiusKm === testRadius,
    `loc: ${targetConfig?.locationName}, radius: ${targetConfig?.deliveryRadiusKm}`
  );

  // 验证 obsidian_truck_info 是否双轨同步
  const syncedTruckInfo = getTruckInfo();
  assert(
    'obsidian_truck_info 主信息同步更新新停靠点与经纬度',
    syncedTruckInfo.currentLocationName === testNewLocation &&
    syncedTruckInfo.latitude === testLat &&
    syncedTruckInfo.longitude === testLng,
    `loc: ${syncedTruckInfo.currentLocationName}, coords: [${syncedTruckInfo.longitude}, ${syncedTruckInfo.latitude}]`
  );

  // 5. 验证 fetchTruckLocationsFromCloud 与 fetchTruckInfoFromCloud 的容灾和兜底
  const cloudLocRes = await fetchTruckLocationsFromCloud();
  assert(
    'fetchTruckLocationsFromCloud 具备安全返回与保底',
    cloudLocRes.configs && cloudLocRes.configs.length >= 3,
    `returned ${cloudLocRes.configs.length} configs, fromCloud=${cloudLocRes.fromCloud}`
  );

  const cloudInfoRes = await fetchTruckInfoFromCloud();
  assert(
    'fetchTruckInfoFromCloud 具备安全返回与保底',
    !!cloudInfoRes.truck && !!cloudInfoRes.truck.name,
    `truckName: ${cloudInfoRes.truck.name}`
  );

  console.log(`\n===========================================`);
  console.log(`总计 ${passCount + failCount} 项，通过 ${passCount} 项，失败 ${failCount} 项`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
