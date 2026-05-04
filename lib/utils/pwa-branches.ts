export interface BranchInfo {
  costcenter: string   // 1032–1057
  ba: string           // 5512011–5512036
  name_th: string
}

export const PWA_BRANCHES: BranchInfo[] = [
  { costcenter: '1032', ba: '5512011', name_th: 'นครสวรรค์' },
  { costcenter: '1033', ba: '5512012', name_th: 'ท่าตะโก' },
  { costcenter: '1034', ba: '5512013', name_th: 'ลาดยาว' },
  { costcenter: '1035', ba: '5512014', name_th: 'พยุหะคีรี' },
  { costcenter: '1036', ba: '5512015', name_th: 'ชัยนาท' },
  { costcenter: '1037', ba: '5512016', name_th: 'อุทัยธานี' },
  { costcenter: '1038', ba: '5512017', name_th: 'กำแพงเพชร' },
  { costcenter: '1039', ba: '5512018', name_th: 'ขาณุวรลักษบุรี' },
  { costcenter: '1040', ba: '5512019', name_th: 'ตาก' },
  { costcenter: '1041', ba: '5512020', name_th: 'แม่สอด' },
  { costcenter: '1042', ba: '5512021', name_th: 'สุโขทัย' },
  { costcenter: '1043', ba: '5512022', name_th: 'ทุ่งเสลี่ยม' },
  { costcenter: '1044', ba: '5512023', name_th: 'ศรีสำโรง' },
  { costcenter: '1045', ba: '5512024', name_th: 'สวรรคโลก' },
  { costcenter: '1046', ba: '5512025', name_th: 'ศรีสัชนาลัย' },
  { costcenter: '1047', ba: '5512026', name_th: 'อุตรดิตถ์' },
  { costcenter: '1048', ba: '5512027', name_th: 'พิษณุโลก' },
  { costcenter: '1049', ba: '5512028', name_th: 'นครไทย' },
  { costcenter: '1050', ba: '5512029', name_th: 'พิจิตร' },
  { costcenter: '1051', ba: '5512030', name_th: 'บางมูลนาก' },
  { costcenter: '1052', ba: '5512031', name_th: 'ตะพานหิน' },
  { costcenter: '1053', ba: '5512032', name_th: 'เพชรบูรณ์' },
  { costcenter: '1054', ba: '5512033', name_th: 'หล่มสัก' },
  { costcenter: '1055', ba: '5512034', name_th: 'ชนแดน' },
  { costcenter: '1056', ba: '5512035', name_th: 'หนองไผ่' },
  { costcenter: '1057', ba: '5512036', name_th: 'วิเชียรบุรี' },
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
