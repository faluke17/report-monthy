export interface BranchInfo {
  costcenter: string     // 1032–1057
  ba: string             // 5512011–5512036
  name_th: string
  dmama_branch_id: number // dmama API branch_id: 29–54
}

export const PWA_BRANCHES: BranchInfo[] = [
  { costcenter: '1032', ba: '5512011', name_th: 'นครสวรรค์',      dmama_branch_id: 29 },
  { costcenter: '1033', ba: '5512012', name_th: 'ท่าตะโก',        dmama_branch_id: 30 },
  { costcenter: '1034', ba: '5512013', name_th: 'ลาดยาว',         dmama_branch_id: 31 },
  { costcenter: '1035', ba: '5512014', name_th: 'พยุหะคีรี',      dmama_branch_id: 32 },
  { costcenter: '1036', ba: '5512015', name_th: 'ชัยนาท',         dmama_branch_id: 33 },
  { costcenter: '1037', ba: '5512016', name_th: 'อุทัยธานี',      dmama_branch_id: 34 },
  { costcenter: '1038', ba: '5512017', name_th: 'กำแพงเพชร',      dmama_branch_id: 35 },
  { costcenter: '1039', ba: '5512018', name_th: 'ขาณุวรลักษบุรี', dmama_branch_id: 36 },
  { costcenter: '1040', ba: '5512019', name_th: 'ตาก',            dmama_branch_id: 37 },
  { costcenter: '1041', ba: '5512020', name_th: 'แม่สอด',         dmama_branch_id: 38 },
  { costcenter: '1042', ba: '5512021', name_th: 'สุโขทัย',        dmama_branch_id: 39 },
  { costcenter: '1043', ba: '5512022', name_th: 'ทุ่งเสลี่ยม',   dmama_branch_id: 40 },
  { costcenter: '1044', ba: '5512023', name_th: 'ศรีสำโรง',       dmama_branch_id: 41 },
  { costcenter: '1045', ba: '5512024', name_th: 'สวรรคโลก',       dmama_branch_id: 42 },
  { costcenter: '1046', ba: '5512025', name_th: 'ศรีสัชนาลัย',   dmama_branch_id: 43 },
  { costcenter: '1047', ba: '5512026', name_th: 'อุตรดิตถ์',      dmama_branch_id: 44 },
  { costcenter: '1048', ba: '5512027', name_th: 'พิษณุโลก',       dmama_branch_id: 45 },
  { costcenter: '1049', ba: '5512028', name_th: 'นครไทย',         dmama_branch_id: 46 },
  { costcenter: '1050', ba: '5512029', name_th: 'พิจิตร',         dmama_branch_id: 47 },
  { costcenter: '1051', ba: '5512030', name_th: 'บางมูลนาก',      dmama_branch_id: 48 },
  { costcenter: '1052', ba: '5512031', name_th: 'ตะพานหิน',       dmama_branch_id: 49 },
  { costcenter: '1053', ba: '5512032', name_th: 'เพชรบูรณ์',      dmama_branch_id: 50 },
  { costcenter: '1054', ba: '5512033', name_th: 'หล่มสัก',        dmama_branch_id: 51 },
  { costcenter: '1055', ba: '5512034', name_th: 'ชนแดน',          dmama_branch_id: 52 },
  { costcenter: '1056', ba: '5512035', name_th: 'หนองไผ่',        dmama_branch_id: 53 },
  { costcenter: '1057', ba: '5512036', name_th: 'วิเชียรบุรี',    dmama_branch_id: 54 },
]

const byCostcenter = new Map(PWA_BRANCHES.map((b) => [b.costcenter, b]))
const byBa = new Map(PWA_BRANCHES.map((b) => [b.ba, b]))
const nameOrder = new Map(PWA_BRANCHES.map((b, i) => [b.name_th, i]))

export function getBranchByCostcenter(code: string): BranchInfo | undefined {
  return byCostcenter.get(code)
}

export function getBranchByBa(code: string): BranchInfo | undefined {
  return byBa.get(code)
}

export function sortByPwaBranches<T extends { name_th: string }>(branches: T[]): T[] {
  return [...branches].sort((a, b) => {
    const ai = nameOrder.get(a.name_th) ?? 999
    const bi = nameOrder.get(b.name_th) ?? 999
    return ai - bi
  })
}

export function getBranchName(costcenter: string, ba?: string): string {
  return (
    byCostcenter.get(costcenter)?.name_th ??
    (ba ? byBa.get(ba)?.name_th : undefined) ??
    ''
  )
}

export function getDmamabranchId(nameTh: string): number | undefined {
  return PWA_BRANCHES.find((b) => b.name_th === nameTh)?.dmama_branch_id
}
