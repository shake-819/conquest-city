import { useEffect, useState } from 'react';
import { useGameStore, TOWN_COLS, TOWN_ROWS } from '../../game/store';
import { ResearchPanel } from './ResearchPanel';
import {
  BUILDING_CONFIGS,
  UNIT_CONFIGS,
  resourceCapsForLevel,
  townHallUpgradeCost,
  UNLOCK_COLS_BY_LEVEL,
  isCellUnlocked,
  UNIT_LEVEL_MULT,
  MAX_TOWN_LEVEL,
  maxUnitLevelForTown,
  maxBuildingLevelForTown,
  unlockedTierForBarracksLevel,
  MAX_UNIT_TIER,
  isBarracksType,
  unitsForBarracksType,
  BARRACKS_DISPLAY,
  hospitalCapacity,
} from '../../game/constants';
import type { BuildingType } from '../../game/types';
import { RESEARCH_DEFINITIONS } from '../../game/research';

const BUILDING_ICONS: Record<string, string> = {
  townhall: '🏰',
  house: '🏠',
  farm: '🌾',
  barracks: '⚔️',
  barracks_melee: '⚔️',
  barracks_ranged: '🏹',
  barracks_tank: '🛡️',
  barracks_caster: '🔮',
  hospital: '🏥',
  research_lab: '🔬',
  tower: '🗼',
  wall: '🧱',
  mine: '⛏️',
  lumbermill: '🪵',
  quarry: '🪨',
};

const LEVEL_COLORS = ['#aaa', '#4caf50', '#ff9800', '#e91e63'];

/** Accent color keyed by unlocked unit tier (1-10) */
const TIER_COLORS: Record<number, string> = {
  1: '#cc6633',
  2: '#9966cc',
  3: '#cc3333',
  4: '#e91e63',
  5: '#3f51b5',
  6: '#009688',
  7: '#8bc34a',
  8: '#ff9800',
  9: '#00bcd4',
  10: '#ffd700',
};

function tierColorForLevel(level: number): string {
  const tier = unlockedTierForBarracksLevel(level);
  return TIER_COLORS[Math.max(1, tier)] ?? '#aaa';
}

type BuildCategory = { label: string; types: BuildingType[] };

const BUILD_CATEGORIES: BuildCategory[] = [
  { label: '🏘️ 生産',  types: ['house', 'farm'] },
  { label: '⚔️ 訓練所', types: ['barracks_melee', 'barracks_ranged', 'barracks_tank', 'barracks_caster', 'hospital'] },
  { label: '🛡️ 防衛',  types: ['tower', 'wall'] },
  { label: '⛏️ 採掘',  types: ['mine', 'lumbermill', 'quarry'] },
  { label: '🔬 研究',  types: ['research_lab'] },
];

export function TownView() {
  const townGrid = useGameStore((s) => s.townGrid);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const resources = useGameStore((s) => s.resources);
  const townLevel = useGameStore((s) => s.townLevel);
  const message = useGameStore((s) => s.message);
  const townUnits = useGameStore((s) => s.townUnits);
  const selectedTownUnitId = useGameStore((s) => s.selectedTownUnitId);
  const selectedBarracksId = useGameStore((s) => s.selectedBarracksId);
  const townhallPanelOpen = useGameStore((s) => s.townhallPanelOpen);
  const hospitalPanelOpen = useGameStore((s) => s.hospitalPanelOpen);
  const hospitalWounded = useGameStore((s) => s.hospitalWounded);
  const townHallUpgrade = useGameStore((s) => s.townHallUpgrade);
  const researchPanelOpen = useGameStore((s) => s.researchPanelOpen);
  const researchedNodeIds = useGameStore((s) => s.researchedNodeIds);
  const activeResearchId = useGameStore((s) => s.activeResearchId);
  const researchTimeRemaining = useGameStore((s) => s.researchTimeRemaining);

  const selectTool = useGameStore((s) => s.selectTool);
  const placeBuilding = useGameStore((s) => s.placeBuilding);
  const placeBuildingAt = useGameStore((s) => s.placeBuildingAt);
  const demolishBuilding = useGameStore((s) => s.demolishBuilding);
  const recruitUnit = useGameStore((s) => s.recruitUnit);
  const selectTownUnit = useGameStore((s) => s.selectTownUnit);
  const handleBarracksClick = useGameStore((s) => s.handleBarracksClick);
  const closeBarracks = useGameStore((s) => s.closeBarracks);
  const mergeUnits = useGameStore((s) => s.mergeUnits);
  const dismissTownUnit = useGameStore((s) => s.dismissTownUnit);
  const goToStageSelect = useGameStore((s) => s.goToStageSelect);
  const goToBattleSettings = useGameStore((s) => s.goToBattleSettings);
  const saveGame = useGameStore((s) => s.saveGame);
  const showMessage = useGameStore((s) => s.showMessage);
  const openTownhallPanel = useGameStore((s) => s.openTownhallPanel);
  const closeTownhallPanel = useGameStore((s) => s.closeTownhallPanel);
  const startTownHallUpgrade = useGameStore((s) => s.startTownHallUpgrade);
  const accelerateTownHallUpgrade = useGameStore((s) => s.accelerateTownHallUpgrade);
  const openHospitalPanel = useGameStore((s) => s.openHospitalPanel);
  const closeHospitalPanel = useGameStore((s) => s.closeHospitalPanel);
  const openResearchPanel = useGameStore((s) => s.openResearchPanel);
  const closeResearchPanel = useGameStore((s) => s.closeResearchPanel);
  const startResearch = useGameStore((s) => s.startResearch);
  const dischargeUnit = useGameStore((s) => s.dischargeUnit);
  const dismissWounded = useGameStore((s) => s.dismissWounded);
  const bulkBuildBuilding = useGameStore((s) => s.bulkBuildBuilding);
  const debugSetTownLevel = useGameStore((s) => s.debugSetTownLevel);
  const devMaxResources = useGameStore((s) => s.devMaxResources);
  const autoMergeEnabled = useGameStore((s) => s.autoMergeEnabled);
  const toggleAutoMerge = useGameStore((s) => s.toggleAutoMerge);
  const [bulkBuildOpen, setBulkBuildOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [resourcesHovered, setResourcesHovered] = useState(false);
  // Cell picked with the 🖱️選択 tool, so the next building purchase places there instead of auto-placing
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);

  // Drop any pending cell selection when the tool changes away from 'select', or the
  // town level changes (unlocked area / building availability may have shifted).
  useEffect(() => {
    if (selectedTool !== 'select') setSelectedCell(null);
  }, [selectedTool]);
  useEffect(() => {
    setSelectedCell(null);
  }, [townLevel]);

  const STAGE_NAMES = ['開拓地', '村', '町', '街', '大街', '都市'];
  const stageName = STAGE_NAMES[Math.floor(townLevel / 5)] ?? '都市';
  const levelDisplay = `${stageName} Lv.${townLevel + 1}`;
  const caps = resourceCapsForLevel(townLevel);
  const unlockedCols = UNLOCK_COLS_BY_LEVEL[Math.min(townLevel, UNLOCK_COLS_BY_LEVEL.length - 1)];
  const maxUnitLevel = maxUnitLevelForTown(townLevel);
  const maxBuildingLevel = maxBuildingLevelForTown(townLevel);
  const isMaxTownLevel = townLevel >= MAX_TOWN_LEVEL;
  const nextUpgradeCost = !isMaxTownLevel ? townHallUpgradeCost(townLevel) : null;

  const selectedUnit = selectedTownUnitId
    ? townUnits.find((u) => u.id === selectedTownUnitId)
    : null;

  // Find the selected barracks building
  let selectedBarracks = null as (typeof townGrid[0][0]) | null;
  if (selectedBarracksId) {
    outer: for (let r = 0; r < TOWN_ROWS; r++) {
      for (let c = 0; c < TOWN_COLS; c++) {
        if (townGrid[r]?.[c]?.id === selectedBarracksId) {
          selectedBarracks = townGrid[r][c];
          break outer;
        }
      }
    }
  }

  const handleCellClick = (col: number, row: number) => {
    if (!isCellUnlocked(col, row, townLevel)) {
      showMessage('この土地はまだ解放されていません！街レベルを上げよう！');
      return;
    }

    if (selectedTool === 'demolish') {
      setSelectedCell(null);
      demolishBuilding(col, row);
      return;
    }

    if (selectedTool !== 'select') {
      placeBuilding(col, row);
      return;
    }

    // Select mode
    closeResearchPanel();
    const cell = townGrid[row]?.[col];
    const unitOnCell = townUnits.find((u) => u.gridX === col && u.gridZ === row);

    if (selectedTownUnitId) {
      // A unit is selected – try to merge or move
      mergeUnits(col, row);
      return;
    }

    if (cell && isBarracksType(cell.type)) {
      setSelectedCell(null);
      closeTownhallPanel();
      closeHospitalPanel();
      handleBarracksClick(col, row);
      return;
    }

    if (cell?.type === 'hospital') {
      setSelectedCell(null);
      closeBarracks();
      closeTownhallPanel();
      openHospitalPanel();
      return;
    }

    if (cell?.type === 'research_lab') {
      setSelectedCell(null);
      closeBarracks();
      closeTownhallPanel();
      closeHospitalPanel();
      openResearchPanel();
      return;
    }

    if (cell?.type === 'townhall') {
      setSelectedCell(null);
      closeBarracks();
      closeHospitalPanel();
      openTownhallPanel();
      return;
    }

    if (unitOnCell) {
      setSelectedCell(null);
      closeTownhallPanel();
      closeHospitalPanel();
      selectTownUnit(unitOnCell.id);
      return;
    }

    // Click empty, unlocked cell in select mode: mark it so the next building
    // purchase from the build panel is placed here instead of auto-placed.
    closeBarracks();
    closeTownhallPanel();
    closeHospitalPanel();
    selectTownUnit(null);
    if (cell || unitOnCell) {
      // Non-empty, non-interactive cell (shouldn't normally happen) — just deselect.
      setSelectedCell(null);
      return;
    }
    setSelectedCell((prev) => (prev && prev.col === col && prev.row === row ? null : { col, row }));
  };

  // Units available from the selected barracks (filtered by facility archetype)
  const barracksUnits = selectedBarracks
    ? unitsForBarracksType(selectedBarracks.type, selectedBarracks.level)
    : [];
  const unlockedTier = selectedBarracks ? unlockedTierForBarracksLevel(selectedBarracks.level) : 0;
  const facilityDisplay = selectedBarracks
    ? (BARRACKS_DISPLAY[selectedBarracks.type] ?? BARRACKS_DISPLAY['barracks'])
    : null;

  // Total hospital capacity across all hospital buildings
  const totalHospitalCapacity = townGrid.flat().reduce((sum, cell) => {
    return cell?.type === 'hospital' ? sum + hospitalCapacity(cell.level) : sum;
  }, 0);

  // Does the grid have another facility of the same type+level (for merge hint)?
  const hasMergeTarget = selectedBarracks
    ? townGrid.flat().some(
        (b) =>
          b?.type === selectedBarracks!.type &&
          b.level === selectedBarracks!.level &&
          b.id !== selectedBarracksId
      )
    : false;

  const researchNodes = RESEARCH_DEFINITIONS.map((node) => {
    const researched = researchedNodeIds.includes(node.id);
    const researching = activeResearchId === node.id;
    const locked = Boolean(node.prerequisiteId && !researchedNodeIds.includes(node.prerequisiteId));
    const canAfford =
      resources.gold >= node.cost.gold &&
      resources.wood >= node.cost.wood &&
      resources.stone >= node.cost.stone &&
      resources.food >= node.cost.food;
    return {
      id: node.id,
      category: node.category,
      categoryLabel: node.categoryLabel,
      categoryColor: node.categoryColor,
      name: node.name,
      description: node.description,
      effectLabel: node.effectLabel,
      cost: node.cost,
      prerequisiteId: node.prerequisiteId,
      prerequisiteName: node.prerequisiteId
        ? RESEARCH_DEFINITIONS.find((candidate) => candidate.id === node.prerequisiteId)?.name ?? null
        : null,
      state: researched ? 'researched' as const : researching ? 'researching' as const : locked ? 'locked' as const : 'available' as const,
      progress: researched
        ? 100
        : researching && researchTimeRemaining !== null
          ? 100 * (1 - researchTimeRemaining / node.durationSec)
          : 0,
      canAfford,
    };
  });

  return (
    <div style={{
      width: '100%', height: '100dvh', minHeight: 0,
      background: 'linear-gradient(160deg, #1a2a0a 0%, #0d1a0a 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
        gap: 8,
        flexWrap: 'wrap',
      }}
        onMouseEnter={() => setResourcesHovered(true)}
        onMouseLeave={() => setResourcesHovered(false)}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#ffd700', fontWeight: 900, fontSize: 16 }}>
            🏰 {levelDisplay}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ color: '#aaa', fontSize: 11 }}>
              🗺️ {unlockedCols}×{TOWN_ROWS} ｜ 兵最大Lv.{maxUnitLevel} ｜ 建物最大Lv.{maxBuildingLevel}
            </span>
            {townHallUpgrade ? (
              <span style={{ color: '#88ccff', fontSize: 10 }}>
                🏗️ 本拠地レベルアップ中… 残り{Math.ceil(townHallUpgrade.timeRemaining)}秒
              </span>
            ) : !isMaxTownLevel && nextUpgradeCost ? (
              <span style={{ color: '#888', fontSize: 10 }}>
                🏰 本拠地をタップしてレベルアップ（🪵{nextUpgradeCost.wood} 🪨{nextUpgradeCost.stone}）
              </span>
            ) : (
              <span style={{ color: '#ffd700', fontSize: 10 }}>★ 最高レベル到達！</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hospitalWounded.length > 0 && (
            <button
              onClick={openHospitalPanel}
              style={{
                ...btnStyle('#9c1144'),
                position: 'relative',
                padding: '6px 12px',
                animation: 'pulse 1.5s infinite',
              }}
              title="入院中の兵士がいます"
            >
              🏥 傷病者 {hospitalWounded.length}名
            </button>
          )}
          <button onClick={saveGame} style={btnStyle('#3a7a3a')}>
            💾 セーブ
          </button>
          <button onClick={() => goToBattleSettings('town')} style={btnStyle('#6c4cc4')}>
            ⚙️ 戦術・陣形
          </button>
          <button onClick={goToStageSelect} style={btnStyle('#e25822')}>
            ⚔️ 出撃（{townUnits.length}名）
          </button>
        </div>
        <div
          aria-label="資源バー"
          style={{
            position: 'absolute', top: 'calc(100% + 5px)', left: 12,
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '7px 12px',
            background: 'rgba(8,14,5,0.96)',
            border: '1px solid rgba(255,215,0,0.35)',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            opacity: resourcesHovered ? 1 : 0,
            visibility: resourcesHovered ? 'visible' : 'hidden',
            pointerEvents: resourcesHovered ? 'auto' : 'none',
            transition: 'opacity 0.12s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {[
            { icon: '🪙', value: resources.gold, cap: caps.gold, color: '#ffd700' },
            { icon: '🌾', value: resources.food, cap: caps.food, color: '#8bc34a' },
            { icon: '🪵', value: resources.wood, cap: caps.wood, color: '#c88a4e' },
            { icon: '🪨', value: resources.stone, cap: caps.stone, color: '#aaaaaa' },
          ].map((resource) => (
            <div key={resource.icon} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ color: resource.color, fontWeight: 700, fontSize: 13 }}>
                {resource.icon} {Math.floor(resource.value)}
              </span>
              <span style={{ color: resource.color, fontSize: 9, opacity: 0.65 }}>
                /{resource.cap}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          textAlign: 'center', padding: '6px',
          background: 'rgba(255,221,68,0.15)',
          color: '#ffdd44', fontWeight: 700, fontSize: 13,
          borderBottom: '1px solid rgba(255,221,68,0.2)',
          flexShrink: 0,
        }}>
          {message}
        </div>
      )}

      {researchPanelOpen && (
        <ResearchPanel
          nodes={researchNodes}
          resources={resources}
          researchTimer={researchTimeRemaining}
          onResearch={startResearch}
          onClose={closeResearchPanel}
        />
      )}

      {selectedCell && !selectedBarracks && !townhallPanelOpen && (
        <div style={{
          textAlign: 'center', padding: '5px',
          background: 'rgba(255,215,0,0.12)',
          color: '#ffd700', fontWeight: 700, fontSize: 12,
          borderBottom: '1px solid rgba(255,215,0,0.2)',
          flexShrink: 0,
        }}>
          📍 マスを選択中 — 下の建物を選ぶとここに建築されます（もう一度クリックで解除）
        </div>
      )}

      {/* Selected unit info bar */}
      {selectedUnit && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '6px 16px',
          background: 'rgba(100,180,255,0.15)',
          borderBottom: '1px solid rgba(100,180,255,0.3)',
          flexShrink: 0,
        }}>
          <span style={{ color: '#87ceeb', fontWeight: 700 }}>
            {UNIT_CONFIGS[selectedUnit.type].emoji} {UNIT_CONFIGS[selectedUnit.type].nameJP} Lv.{selectedUnit.level} を選択中
          </span>
          {selectedUnit.level < maxUnitLevel ? (
            <span style={{ color: '#aaa', fontSize: 12 }}>
              → 同じ種類・レベルの兵士マスをタップして合成 ｜ 空きマスで移動
            </span>
          ) : (
            <span style={{ color: '#ffa726', fontSize: 12 }}>★ 最大レベル！</span>
          )}
          <button
            onClick={() => dismissTownUnit(selectedUnit.id)}
            style={{ ...btnStyle('#c0392b'), padding: '3px 10px', fontSize: 11 }}
          >
            解散
          </button>
          <button
            onClick={() => selectTownUnit(null)}
            style={{ ...btnStyle('#555'), padding: '3px 10px', fontSize: 11 }}
          >
            ✕ 選択解除
          </button>
        </div>
      )}

      {/* Main area */}
      <div style={{
        flex: 1, minHeight: 0, minWidth: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px', overflow: 'hidden',
      }}>
        {/* Town Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${TOWN_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${TOWN_ROWS}, 1fr)`,
          gap: 2,
          background: 'rgba(0,0,0,0.3)',
          padding: 6,
          borderRadius: 12,
          border: '2px solid rgba(255,255,255,0.1)',
           width: 'min(96vw, 740px)',
           maxWidth: '100%', maxHeight: '100%', minWidth: 0, minHeight: 0,
          aspectRatio: `${TOWN_COLS} / ${TOWN_ROWS}`,
        }}>
          {Array.from({ length: TOWN_ROWS }, (_, row) =>
            Array.from({ length: TOWN_COLS }, (_, col) => {
              const cell = townGrid[row]?.[col];
              const isBase = cell?.type === 'townhall';
              const isDemolishMode = selectedTool === 'demolish';
              const locked = !isCellUnlocked(col, row, townLevel);
              const unitOnCell = townUnits.find((u) => u.gridX === col && u.gridZ === row);
              const isSelectedUnit = unitOnCell?.id === selectedTownUnitId;
              const isBarracksSelected = cell?.id === selectedBarracksId;
              const canMergeTarget =
                selectedUnit &&
                unitOnCell &&
                unitOnCell.id !== selectedTownUnitId &&
                unitOnCell.type === selectedUnit.type &&
                unitOnCell.level === selectedUnit.level &&
                selectedUnit.level < maxUnitLevel;
              const canBarracksMerge =
                selectedBarracksId &&
                cell?.type === 'barracks' &&
                cell.id !== selectedBarracksId &&
                cell.level === selectedBarracks?.level;
              const isSelectedBuildCell =
                selectedCell?.col === col && selectedCell?.row === row && !cell && !unitOnCell;

              let bgColor = 'rgba(255,255,255,0.04)';
              let borderColor = 'rgba(255,255,255,0.06)';

              if (locked) {
                bgColor = 'rgba(0,0,0,0.4)';
                borderColor = 'rgba(255,255,255,0.03)';
              } else if (isSelectedBuildCell) {
                bgColor = 'rgba(255,215,0,0.3)';
                borderColor = '#ffd700';
              } else if (isSelectedUnit) {
                bgColor = 'rgba(100,180,255,0.35)';
                borderColor = '#87ceeb';
              } else if (isBarracksSelected) {
                bgColor = 'rgba(255,100,50,0.35)';
                borderColor = '#ff6644';
              } else if (canBarracksMerge) {
                bgColor = 'rgba(180,100,255,0.25)';
                borderColor = '#cc88ff';
              } else if (canMergeTarget) {
                bgColor = 'rgba(100,255,100,0.25)';
                borderColor = '#66ff66';
              } else if (unitOnCell) {
                bgColor = 'rgba(80,130,200,0.2)';
                borderColor = 'rgba(100,180,255,0.4)';
              } else if (cell) {
                if (isBase) {
                  bgColor = 'rgba(74,144,226,0.3)';
                  borderColor = '#4a90e2';
                } else if (isDemolishMode) {
                  bgColor = 'rgba(200,50,50,0.25)';
                  borderColor = '#cc4444';
                } else {
                  bgColor = 'rgba(255,255,255,0.1)';
                  borderColor = 'rgba(255,255,255,0.25)';
                }
              }

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => handleCellClick(col, row)}
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 4,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                    transition: 'all 0.1s',
                    userSelect: 'none',
                    fontSize: 'clamp(11px, 2vw, 18px)',
                    position: 'relative',
                    opacity: locked ? 0.35 : 1,
                  }}
                >
                  {locked && !cell && !unitOnCell && (
                    <span style={{ fontSize: 'clamp(8px, 1.5vw, 13px)', opacity: 0.5 }}>🔒</span>
                  )}

                  {/* Building icon */}
                  {cell && (
                    <>
                      <span>{BUILDING_ICONS[cell.type] ?? '🏗️'}</span>
                      <div style={{
                        position: 'absolute', bottom: 1,
                        fontSize: '6px', color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1, textAlign: 'center',
                      }}>
                        {BUILDING_CONFIGS[cell.type].nameJP}
                        {cell.type === 'barracks' && cell.level > 1 && (
                          <span style={{ color: tierColorForLevel(cell.level), marginLeft: 2 }}>
                            Lv.{cell.level}
                          </span>
                        )}
                      </div>
                      {/* Barracks merge hint arrow */}
                      {canBarracksMerge && (
                        <div style={{
                          position: 'absolute', top: 1, right: 2,
                          fontSize: '7px', color: '#cc88ff', fontWeight: 900,
                        }}>
                          ⬆
                        </div>
                      )}
                    </>
                  )}

                  {/* Unit icon (on empty cell) */}
                  {unitOnCell && !cell && (
                    <>
                      <span style={{
                        filter: isSelectedUnit ? 'drop-shadow(0 0 4px #87ceeb)' : undefined,
                      }}>
                        {UNIT_CONFIGS[unitOnCell.type].emoji}
                      </span>
                      <div style={{
                        position: 'absolute', bottom: 1,
                        fontSize: '6px',
                        color: LEVEL_COLORS[unitOnCell.level] ?? '#aaa',
                        fontWeight: 700, lineHeight: 1,
                      }}>
                        Lv.{unitOnCell.level}
                      </div>
                    </>
                  )}

                  {/* Unit merge hint */}
                  {canMergeTarget && (
                    <div style={{
                      position: 'absolute', top: 1, right: 2,
                      fontSize: '7px', color: '#66ff66', fontWeight: 900,
                    }}>
                      ▲
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Training facility recruit panel */}
      {selectedBarracks && facilityDisplay && (
        <div style={{
          background: 'rgba(0,0,0,0.92)',
          borderTop: `2px solid ${facilityDisplay.color}`,
          padding: '10px 16px',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 8, flexWrap: 'wrap',
          }}>
            <span style={{ color: facilityDisplay.color, fontWeight: 700, fontSize: 14 }}>
              {facilityDisplay.emoji} {facilityDisplay.label} Lv.{selectedBarracks.level}
              {unlockedTier > 0
                ? ` — Tier 1〜${unlockedTier} を招集（計${barracksUnits.length}種）`
                : ' — 訓練不可（Lv.3以上で解放）'}
            </span>
            {selectedBarracks.level < maxBuildingLevel && (
              <span style={{ color: '#cc88ff', fontSize: 11 }}>
                {hasMergeTarget
                  ? `💜 同じLv.の${facilityDisplay.label}をタップして合成→Lv.アップ`
                  : (selectedBarracks.level + 1) % 3 === 0
                    ? `💜 Lv.${selectedBarracks.level}をもう1棟建てて合成するとTier${unlockedTierForBarracksLevel(selectedBarracks.level + 1)}解放！`
                    : `💜 Lv.${selectedBarracks.level}をもう1棟建てて合成するとLv.${selectedBarracks.level + 1}に！`}
              </span>
            )}
            {selectedBarracks.level >= maxBuildingLevel && selectedBarracks.level < 30 && (
              <span style={{ color: '#888', fontSize: 11 }}>
                （Lv.{selectedBarracks.level + 1}には街Lv.{selectedBarracks.level + 1}以上が必要）
              </span>
            )}
            {selectedBarracks.level >= 30 && (
              <span style={{ color: '#ffd700', fontSize: 11 }}>★ 最高ランク！全Tier解放済み</span>
            )}
            <button onClick={closeBarracks} style={{ ...btnStyle('#555'), padding: '3px 10px', fontSize: 11, marginLeft: 'auto' }}>
              ✕ 閉じる
            </button>
          </div>
          {barracksUnits.length === 0 && (
            <div style={{ color: '#888', fontSize: 12, padding: '8px 0' }}>
              まだ訓練できません。Lv.3以上に合成するとTier1の兵種が解放されます。
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {barracksUnits.map((type) => {
              const cfg = UNIT_CONFIGS[type];
              const canAfford = resources.gold >= cfg.cost.gold && resources.food >= cfg.cost.food;
              const mult = UNIT_LEVEL_MULT[0];
              const unitColor = TIER_COLORS[cfg.barracksTier] ?? '#ff9944';
              return (
                <button
                  key={type}
                  onClick={() => canAfford && recruitUnit(type)}
                  disabled={!canAfford}
                  style={{
                    background: !canAfford ? 'rgba(255,255,255,0.04)' : `${facilityDisplay.color}22`,
                    border: `2px solid ${canAfford ? unitColor : '#333'}`,
                    borderRadius: 8,
                    color: !canAfford ? '#555' : '#fff',
                    padding: '8px 14px',
                    cursor: !canAfford ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: !canAfford ? 0.5 : 1,
                    textAlign: 'left',
                    minWidth: 140,
                  }}
                >
                  <div>{cfg.emoji} {cfg.nameJP} <span style={{ fontSize: 9, color: unitColor }}>T{cfg.barracksTier}</span></div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    🪙{cfg.cost.gold} 🌾{cfg.cost.food}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    HP:{Math.round(cfg.maxHp * mult.hp)} ATK:{Math.round(cfg.damage * mult.damage)} RNG:{cfg.attackRange}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ color: '#666', fontSize: 10, marginTop: 6 }}>
            ★ 同じ兵種・レベルの兵士マスをタップして合成→レベルアップ（最大 Lv.{maxUnitLevel}） ｜ 3レベルごとに新Tier解放（最大Tier{MAX_UNIT_TIER}・Lv.30）
          </div>
        </div>
      )}

      {/* Hospital panel */}
      {hospitalPanelOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.92)',
          borderTop: '2px solid #e91e63',
          padding: '10px 16px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#e91e63', fontWeight: 700, fontSize: 14 }}>
              🏥 病院　入院中：{hospitalWounded.length}/{totalHospitalCapacity}名
            </span>
            {totalHospitalCapacity === 0 && (
              <span style={{ color: '#888', fontSize: 11 }}>（病院がありません。建設すると兵士を収容できます）</span>
            )}
            <button onClick={closeHospitalPanel} style={{ ...btnStyle('#555'), padding: '3px 10px', fontSize: 11, marginLeft: 'auto' }}>
              ✕ 閉じる
            </button>
          </div>

          {hospitalWounded.length === 0 ? (
            <div style={{ color: '#888', fontSize: 12, padding: '6px 0' }}>
              現在入院中の兵士はいません。戦闘で倒れた兵士がここに収容されます。
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hospitalWounded.map((w) => {
                const cfg = UNIT_CONFIGS[w.unitType];
                const canTreat = resources.gold >= w.goldCost && resources.food >= w.foodCost;
                const tierColor = TIER_COLORS[cfg.barracksTier] ?? '#ff9944';
                return (
                  <div key={w.id} style={{
                    background: 'rgba(233,30,99,0.12)',
                    border: '2px solid #e91e63',
                    borderRadius: 8,
                    padding: '8px 12px',
                    minWidth: 150,
                  }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                      {cfg.emoji} {cfg.nameJP} <span style={{ fontSize: 9, color: tierColor }}>Lv.{w.unitLevel} T{cfg.barracksTier}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>
                      治療費：🪙{w.goldCost} 🌾{w.foodCost}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        onClick={() => dischargeUnit(w.id)}
                        disabled={!canTreat}
                        style={{
                          ...btnStyle(canTreat ? '#4caf50' : '#333'),
                          padding: '4px 10px', fontSize: 11,
                          opacity: canTreat ? 1 : 0.5,
                          cursor: canTreat ? 'pointer' : 'not-allowed',
                        }}
                      >
                        💊 治療
                      </button>
                      <button
                        onClick={() => dismissWounded(w.id)}
                        style={{ ...btnStyle('#555'), padding: '4px 10px', fontSize: 11 }}
                      >
                        🗑️ 解放
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ color: '#666', fontSize: 10, marginTop: 8 }}>
            ★ 病院をLvアップすると収容数UP（Lv×2名）。入院枠を超えた兵士は永久に消滅します。
          </div>
        </div>
      )}

      {/* Town Hall upgrade panel */}
      {townhallPanelOpen && !selectedBarracks && (
        <div style={{
          background: 'rgba(0,0,0,0.92)',
          borderTop: '2px solid #4a90e2',
          padding: '10px 16px',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 8, flexWrap: 'wrap',
          }}>
            <span style={{ color: '#7ab8ff', fontWeight: 700, fontSize: 14 }}>
              🏰 本拠地 Lv.{townLevel + 1}
            </span>
            <button onClick={closeTownhallPanel} style={{ ...btnStyle('#555'), padding: '3px 10px', fontSize: 11, marginLeft: 'auto' }}>
              ✕ 閉じる
            </button>
          </div>
          {isMaxTownLevel ? (
            <div style={{ color: '#ffd700', fontSize: 13, fontWeight: 700 }}>★ 本拠地は最大レベルに到達しています！</div>
          ) : townHallUpgrade ? (
            <div>
              <div style={{ color: '#88ccff', fontSize: 13, marginBottom: 6 }}>
                🏗️ レベルアップ中… 残り {Math.ceil(townHallUpgrade.timeRemaining)} 秒
              </div>
              <div style={{
                width: '100%', height: 10, borderRadius: 5,
                background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(100, 100 * (1 - townHallUpgrade.timeRemaining / townHallUpgrade.totalTime))}%`,
                  height: '100%', background: '#4a90e2', transition: 'width 0.2s linear',
                }} />
              </div>
              <button
                onClick={accelerateTownHallUpgrade}
                disabled={resources.gold < 10}
                style={{
                  ...btnStyle(resources.gold >= 10 ? '#e6a700' : '#444'),
                  marginTop: 8,
                  opacity: resources.gold >= 10 ? 1 : 0.5,
                  cursor: resources.gold >= 10 ? 'pointer' : 'not-allowed',
                }}
              >
                ⚡ 1分短縮（🪙10）
              </button>
            </div>
          ) : nextUpgradeCost ? (
            <div>
              <div style={{ color: '#ccc', fontSize: 12, marginBottom: 6 }}>
                必要資源: 🪵 {nextUpgradeCost.wood} ｜ 🪨 {nextUpgradeCost.stone} ｜ ⏱️ {nextUpgradeCost.timeSec}秒
              </div>
              <button
                onClick={startTownHallUpgrade}
                disabled={resources.wood < nextUpgradeCost.wood || resources.stone < nextUpgradeCost.stone}
                style={{
                  ...btnStyle(
                    resources.wood >= nextUpgradeCost.wood && resources.stone >= nextUpgradeCost.stone
                      ? '#4a90e2' : '#444'
                  ),
                  opacity: resources.wood >= nextUpgradeCost.wood && resources.stone >= nextUpgradeCost.stone ? 1 : 0.5,
                  cursor: resources.wood >= nextUpgradeCost.wood && resources.stone >= nextUpgradeCost.stone ? 'pointer' : 'not-allowed',
                }}
              >
                ⬆️ レベルアップ開始
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Bulk Build Modal */}
      {bulkBuildOpen && (
        <BulkBuildPanel
          townLevel={townLevel}
          resources={resources}
          maxBuildingLevel={maxBuildingLevel}
          selectedCell={selectedCell}
          onBuild={(type, level) => {
            const ok = bulkBuildBuilding(type, level, selectedCell);
            if (ok) setSelectedCell(null);
            return ok;
          }}
          onClose={() => setBulkBuildOpen(false)}
        />
      )}

      {/* Developer Panel */}
      {import.meta.env.DEV && devOpen && (
        <DevPanel
          onUnlock={() => {
            debugSetTownLevel(MAX_TOWN_LEVEL);
            devMaxResources();
          }}
          onClose={() => setDevOpen(false)}
        />
      )}

      {/* Build Panel */}
      {!selectedBarracks && !townhallPanelOpen && (
        <BuildPanel
          townLevel={townLevel}
          resources={resources}
          caps={caps}
          selectedCell={selectedCell}
          onPlaceAtSelectedCell={(type) => {
            if (!selectedCell) return;
            placeBuildingAt(type, selectedCell.col, selectedCell.row);
            setSelectedCell(null);
          }}
          onOpenBulkBuild={() => setBulkBuildOpen(true)}
          onOpenDev={() => setDevOpen(true)}
          autoMergeEnabled={autoMergeEnabled}
          onToggleAutoMerge={toggleAutoMerge}
        />
      )}
    </div>
  );
}

function BuildPanel({
  townLevel, resources, caps, selectedCell, onPlaceAtSelectedCell, onOpenBulkBuild, onOpenDev,
  autoMergeEnabled, onToggleAutoMerge,
}: {
  townLevel: number;
  resources: { gold: number; wood: number; food: number; stone: number };
  caps: { gold: number; wood: number; food: number; stone: number };
  selectedCell: { col: number; row: number } | null;
  onPlaceAtSelectedCell: (type: BuildingType) => void;
  onOpenBulkBuild: () => void;
  onOpenDev: () => void;
  autoMergeEnabled: boolean;
  onToggleAutoMerge: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const category = BUILD_CATEGORIES[activeTab];

  return (
    <div style={{
      background: 'rgba(0,0,0,0.82)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      flexShrink: 0,
      maxHeight: '34vh',
      overflowY: 'auto',
    }}>
      {/* Tab bar + utility tools row */}
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Utility buttons */}
        <div style={{ display: 'flex', gap: 4, padding: '5px 10px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <ToolBtn tool="select" label="🖱️ 選択" color="#4a90e2" compact />
          <ToolBtn tool="demolish" label="🗑️ 解体" color="#e24a4a" compact />
          <button
            onClick={onToggleAutoMerge}
            title="自動合成のON/OFFを切り替えます"
            style={{
              background: autoMergeEnabled ? 'rgba(100,255,150,0.12)' : 'rgba(255,255,255,0.07)',
              border: `2px solid ${autoMergeEnabled ? '#5fd97a' : 'rgba(255,255,255,0.25)'}`,
              borderRadius: 7,
              color: autoMergeEnabled ? '#5fd97a' : '#aaa',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            🔗 自動合成: {autoMergeEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onOpenBulkBuild}
            style={{
              background: 'rgba(255,215,0,0.12)',
              border: '2px solid #ffd700',
              borderRadius: 7,
              color: '#ffd700',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            📦 一括建築
          </button>
          {import.meta.env.DEV && (
            <button
              onClick={onOpenDev}
              style={{
                background: 'rgba(128,128,128,0.12)',
                border: '2px solid #888',
                borderRadius: 7,
                color: '#aaa',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              🛠️ DEV
            </button>
          )}
        </div>
        {/* Category tabs */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {BUILD_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                background: activeTab === i ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === i ? '2px solid #4a90e2' : '2px solid transparent',
                color: activeTab === i ? '#fff' : '#888',
                cursor: 'pointer',
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: activeTab === i ? 700 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buildings for active category */}
      <div style={{ display: 'flex', gap: 5, padding: '7px 10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {category.types.map((type) => {
          const cfg = BUILDING_CONFIGS[type];
          const locked = cfg.unlockLevel > townLevel;
          const canAfford =
            resources.gold >= cfg.cost.gold &&
            resources.wood >= cfg.cost.wood &&
            resources.stone >= cfg.cost.stone &&
            resources.food >= cfg.cost.food;
          const costParts = [
            cfg.cost.gold  ? `🪙${cfg.cost.gold}`  : '',
            cfg.cost.wood  ? `🪵${cfg.cost.wood}`  : '',
            cfg.cost.stone ? `🪨${cfg.cost.stone}` : '',
            cfg.cost.food  ? `🌾${cfg.cost.food}`  : '',
          ].filter(Boolean).join(' ');
          return (
            <ToolBtn
              key={type}
              tool={type}
              label={`${locked ? '🔒' : BUILDING_ICONS[type]} ${cfg.nameJP}`}
              color={cfg.color}
              disabled={locked || !canAfford}
              cost={costParts}
              onPlaceAtSelectedCell={selectedCell ? onPlaceAtSelectedCell : undefined}
            />
          );
        })}
      </div>

      {/* Hint row */}
      <div style={{ textAlign: 'center', color: '#444', fontSize: 10, paddingBottom: 5 }}>
        ⚔️訓練所をタップして招集 ｜ 🏰本拠地をタップしてLvアップ ｜ 上限 🪙{caps.gold} 🌾{caps.food} 🪵{caps.wood} 🪨{caps.stone}
      </div>
    </div>
  );
}

const BULK_BUILD_TYPES: BuildingType[] = [
  'house', 'farm', 'wall',
  'barracks_melee', 'barracks_ranged', 'barracks_tank', 'barracks_caster',
  'hospital', 'mine', 'tower', 'lumbermill', 'quarry',
  'research_lab',
];

function BulkBuildPanel({ townLevel, resources, maxBuildingLevel, selectedCell, onBuild, onClose }: {
  townLevel: number;
  resources: { gold: number; wood: number; food: number; stone: number };
  maxBuildingLevel: number;
  selectedCell: { col: number; row: number } | null;
  onBuild: (type: BuildingType, level: number) => boolean;
  onClose: () => void;
}) {
  const availableTypes = BULK_BUILD_TYPES.filter((t) => BUILDING_CONFIGS[t].unlockLevel <= townLevel);
  const [type, setType] = useState<BuildingType>(availableTypes[0] ?? 'house');
  const [level, setLevel] = useState(1);

  const cfg = BUILDING_CONFIGS[type];
  const mult = Math.pow(2, level - 1);
  const cost = {
    gold: Math.round(cfg.cost.gold * mult),
    wood: Math.round(cfg.cost.wood * mult),
    stone: Math.round(cfg.cost.stone * mult),
    food: Math.round(cfg.cost.food * mult),
  };
  const canAfford =
    resources.gold >= cost.gold &&
    resources.wood >= cost.wood &&
    resources.stone >= cost.stone &&
    resources.food >= cost.food;

  const costParts = [
    cost.gold ? `🪙${cost.gold}` : '',
    cost.wood ? `🪵${cost.wood}` : '',
    cost.stone ? `🪨${cost.stone}` : '',
    cost.food ? `🌾${cost.food}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#151f0e', border: '2px solid #ffd700', borderRadius: 12,
          padding: 16, width: 320, maxWidth: '90vw', color: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: '#ffd700', fontSize: 14 }}>📦 一括建築</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 10, color: '#999', marginBottom: 10 }}>
          資源が足りればレベル指定で完成済みの建物をすぐに建設（合成と同じ倍率でコストが上がります）
        </div>
        <div style={{ fontSize: 11, color: selectedCell ? '#8f8' : '#999', marginBottom: 10 }}>
          {selectedCell
            ? `📍 選択中のマス (${selectedCell.col}, ${selectedCell.row}) に建築します`
            : '📍 マス未選択のため、空いている最初のマスに建築します'}
        </div>

        <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4 }}>建物</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {availableTypes.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                background: type === t ? BUILDING_CONFIGS[t].color : 'rgba(255,255,255,0.07)',
                border: `2px solid ${type === t ? BUILDING_CONFIGS[t].color : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 6, color: '#fff', padding: '4px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {BUILDING_ICONS[t] ?? '🏗️'} {BUILDING_CONFIGS[t].nameJP}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4 }}>
           レベル: <span style={{ color: '#ffd700', fontWeight: 700 }}>Lv.{level}</span>（上限 Lv.{maxBuildingLevel}）
        </div>
        <input
          type="range"
          min={1}
           max={maxBuildingLevel}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 10 }}
        />

        <div style={{ fontSize: 12, color: canAfford ? '#8f8' : '#f88', marginBottom: 12 }}>
          必要資源: {costParts || 'なし'}
          <div style={{ fontSize: 9, color: '#777', marginTop: 2 }}>
            （基本コスト × {mult}倍 = 2^{level - 1}）
          </div>
        </div>

        <button
          onClick={() => {
            const ok = onBuild(type, level);
            if (ok) onClose();
          }}
          disabled={!canAfford}
          style={{
            width: '100%',
            ...btnStyle(canAfford ? '#ffd700' : '#444'),
            color: canAfford ? '#151f0e' : '#888',
            opacity: canAfford ? 1 : 0.6,
            cursor: canAfford ? 'pointer' : 'not-allowed',
          }}
        >
          🏗️ Lv.{level} を建築する
        </button>
      </div>
    </div>
  );
}

function DevPanel({ onUnlock, onClose }: { onUnlock: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const unlocked = pin === '0819';
  const pinError = pin.length === 4 && !unlocked;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#151f0e', border: '2px solid #888', borderRadius: 12,
          padding: 16, width: 280, maxWidth: '90vw', color: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: '#aaa', fontSize: 14 }}>🛠️ 開発者用</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 10, color: '#999', marginBottom: 10 }}>
          暗証番号を入力すると、資源を現在の貯蔵上限までMAXにできます。
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="4桁の暗証番号"
          style={{
            width: '100%', padding: 8, borderRadius: 6, border: '1px solid #555',
            background: '#0d1a0a', color: '#fff', fontSize: 13, marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        {pinError && (
          <div style={{ color: '#ff8888', fontSize: 11, marginBottom: 8 }}>
            暗証番号が違います
          </div>
        )}
        <button
          onClick={() => {
            if (!unlocked) return;
            onUnlock();
            onClose();
          }}
          disabled={!unlocked}
          style={{
            width: '100%',
            ...btnStyle(unlocked ? '#888' : '#444'),
            color: unlocked ? '#fff' : '#888',
            opacity: unlocked ? 1 : 0.6,
            cursor: unlocked ? 'pointer' : 'not-allowed',
          }}
        >
          {unlocked ? '💰 資源をMAXにする' : '🔒 暗証番号を入力'}
        </button>
      </div>
    </div>
  );
}

function ToolBtn({
  tool, label, color, disabled = false, cost, compact = false, onPlaceAtSelectedCell,
}: {
  tool: string; label: string; color: string; disabled?: boolean; cost?: string; compact?: boolean;
  /** When set (a cell is pre-selected via 🖱️選択), clicking builds at that cell instead of auto-placing. */
  onPlaceAtSelectedCell?: (type: BuildingType) => void;
}) {
  const selectedTool = useGameStore((s) => s.selectedTool);
  const selectTool = useGameStore((s) => s.selectTool);
  const autoPlaceBuilding = useGameStore((s) => s.autoPlaceBuilding);
  const selected = selectedTool === tool;

  const isBuilding = tool !== 'select' && tool !== 'demolish';

  const handleClick = () => {
    if (disabled) return;
    if (isBuilding) {
      if (onPlaceAtSelectedCell) {
        onPlaceAtSelectedCell(tool as BuildingType);
      } else {
        autoPlaceBuilding(tool as BuildingType);
      }
    } else {
      selectTool(tool as any);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={cost}
      style={{
        background: selected ? color : 'rgba(255,255,255,0.07)',
        border: `2px solid ${selected ? color : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 7,
        color: disabled ? '#555' : '#fff',
        padding: compact ? '4px 8px' : '5px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        minWidth: compact ? 0 : 65,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s',
      }}
    >
      {label}
      {cost && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{cost}</div>}
    </button>
  );
}

function btnStyle(bg: string) {
  return {
    background: bg,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    padding: '7px 14px',
    cursor: 'pointer',
  } as React.CSSProperties;
}
