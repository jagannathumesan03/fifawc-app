import type { Team, Match } from '../types/contract'

export const TEAMS: Team[] = [
  // Group A
  { id: 'MEX', name: 'Mexico',       group: 'A', confederation: 'CONCACAF', rating: 75, flag: '🇲🇽', fifaRanking: 16, keyPlayer: 'Hirving Lozano',    style: 'Counter-attacking',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/203/mexico' },
  { id: 'RSA', name: 'South Africa', group: 'A', confederation: 'CAF',      rating: 66, flag: '🇿🇦', fifaRanking: 64, keyPlayer: 'Percy Tau',         style: 'Physical & direct',    isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/467/south-africa' },
  { id: 'KOR', name: 'South Korea',  group: 'A', confederation: 'AFC',      rating: 74, flag: '🇰🇷', fifaRanking: 20, keyPlayer: 'Son Heung-min',     style: 'High press',           isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/451/south-korea' },
  { id: 'CZE', name: 'Czech Republic', group: 'A', confederation: 'UEFA',     rating: 73, flag: '🇨🇿', fifaRanking: 36, keyPlayer: 'Patrik Schick',     style: 'Organized defense',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/450/czech-republic' },
  // Group B
  { id: 'CAN', name: 'Canada',       group: 'B', confederation: 'CONCACAF', rating: 73, flag: '🇨🇦', fifaRanking: 47, keyPlayer: 'Alphonso Davies',   style: 'Energetic pressing',   isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/206/canada' },
  { id: 'BIH', name: 'Bosnia & Herzegovina', group: 'B', confederation: 'UEFA', rating: 68, flag: '🇧🇦', fifaRanking: 63, keyPlayer: 'Edin Džeko',   style: 'Physical',             isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/452/bosnia-hercegovina' },
  { id: 'QAT', name: 'Qatar',        group: 'B', confederation: 'AFC',      rating: 65, flag: '🇶🇦', fifaRanking: 37, keyPlayer: 'Akram Afif',       style: 'Possession',           isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/4398/qatar' },
  { id: 'SUI', name: 'Switzerland',  group: 'B', confederation: 'UEFA',     rating: 76, flag: '🇨🇭', fifaRanking: 19, keyPlayer: 'Granit Xhaka',     style: 'Disciplined',          isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/475/switzerland' },
  // Group C
  { id: 'BRA', name: 'Brazil',       group: 'C', confederation: 'CONMEBOL', rating: 86, flag: '🇧🇷', fifaRanking: 5,  keyPlayer: 'Vinícius Jr',       style: 'Attacking flair',      isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/205/brazil' },
  { id: 'MAR', name: 'Morocco',      group: 'C', confederation: 'CAF',      rating: 76, flag: '🇲🇦', fifaRanking: 14, keyPlayer: 'Achraf Hakimi',     style: 'Compact & lethal',     isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2869/morocco' },
  { id: 'HAI', name: 'Haiti',        group: 'C', confederation: 'CONCACAF', rating: 60, flag: '🇭🇹', fifaRanking: 83, keyPlayer: 'Naomie Cardichon', style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2654/haiti' },
  { id: 'SCO', name: 'Scotland',     group: 'C', confederation: 'UEFA',     rating: 70, flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', fifaRanking: 39, keyPlayer: 'Andy Robertson',   style: 'High energy',          isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/580/scotland' },
  // Group D
  { id: 'USA', name: 'USA',          group: 'D', confederation: 'CONCACAF', rating: 76, flag: '🇺🇸', fifaRanking: 11, keyPlayer: 'Christian Pulisic', style: 'Athletic & direct',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/660/usa' },
  { id: 'PAR', name: 'Paraguay',     group: 'D', confederation: 'CONMEBOL', rating: 68, flag: '🇵🇾', fifaRanking: 55, keyPlayer: 'Miguel Almirón',    style: 'Defensive solidity',   isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/210/paraguay' },
  { id: 'AUS', name: 'Australia',    group: 'D', confederation: 'AFC',      rating: 69, flag: '🇦🇺', fifaRanking: 25, keyPlayer: 'Mathew Leckie',     style: 'Hard-working',         isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/628/australia' },
  { id: 'TUR', name: 'Turkey',       group: 'D', confederation: 'UEFA',     rating: 74, flag: '🇹🇷', fifaRanking: 27, keyPlayer: 'Hakan Çalhanoğlu', style: 'Technical',            isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/465/turkey' },
  // Group E
  { id: 'GER', name: 'Germany',      group: 'E', confederation: 'UEFA',     rating: 84, flag: '🇩🇪', fifaRanking: 12, keyPlayer: 'Jamal Musiala',     style: 'Total football',       isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/481/germany' },
  { id: 'CUW', name: 'Curaçao',      group: 'E', confederation: 'CONCACAF', rating: 62, flag: '🇨🇼', fifaRanking: 81, keyPlayer: 'Leandro Bacuna',    style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/11678/curacao' },
  { id: 'CIV', name: 'Ivory Coast',  group: 'E', confederation: 'CAF',      rating: 72, flag: '🇨🇮', fifaRanking: 50, keyPlayer: 'Sébastien Haller',  style: 'Physical',             isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/4789/ivory-coast' },
  { id: 'ECU', name: 'Ecuador',      group: 'E', confederation: 'CONMEBOL', rating: 71, flag: '🇪🇨', fifaRanking: 44, keyPlayer: 'Enner Valencia',    style: 'Physical & set pieces',isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/209/ecuador' },
  // Group F
  { id: 'NED', name: 'Netherlands',  group: 'F', confederation: 'UEFA',     rating: 84, flag: '🇳🇱', fifaRanking: 7,  keyPlayer: 'Virgil van Dijk',   style: 'Attacking Dutch',      isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/449/netherlands' },
  { id: 'JPN', name: 'Japan',        group: 'F', confederation: 'AFC',      rating: 75, flag: '🇯🇵', fifaRanking: 18, keyPlayer: 'Takehiro Tomiyasu', style: 'Disciplined press',    isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/627/japan' },
  { id: 'SWE', name: 'Sweden',       group: 'F', confederation: 'UEFA',     rating: 73, flag: '🇸🇪', fifaRanking: 23, keyPlayer: 'Victor Nilsson Lindelöf', style: 'Structured',     isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/466/sweden' },
  { id: 'TUN', name: 'Tunisia',      group: 'F', confederation: 'CAF',      rating: 68, flag: '🇹🇳', fifaRanking: 30, keyPlayer: 'Youssef Msakni',    style: 'Defensive & quick',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/659/tunisia' },
  // Group G
  { id: 'BEL', name: 'Belgium',      group: 'G', confederation: 'UEFA',     rating: 80, flag: '🇧🇪', fifaRanking: 3,  keyPlayer: 'Kevin De Bruyne',   style: 'Attacking midfield',   isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/459/belgium' },
  { id: 'EGY', name: 'Egypt',        group: 'G', confederation: 'CAF',      rating: 70, flag: '🇪🇬', fifaRanking: 35, keyPlayer: 'Mohamed Salah',     style: 'Counter-attacking',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2620/egypt' },
  { id: 'IRN', name: 'Iran',         group: 'G', confederation: 'AFC',      rating: 69, flag: '🇮🇷', fifaRanking: 22, keyPlayer: 'Sardar Azmoun',     style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/469/iran' },
  { id: 'NZL', name: 'New Zealand',  group: 'G', confederation: 'OFC',      rating: 62, flag: '🇳🇿', fifaRanking: 97, keyPlayer: 'Chris Wood',        style: 'Physical',             isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2666/new-zealand' },
  // Group H
  { id: 'ESP', name: 'Spain',        group: 'H', confederation: 'UEFA',     rating: 87, flag: '🇪🇸', fifaRanking: 6,  keyPlayer: 'Pedri',             style: 'Tiki-taka',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/164/spain' },
  { id: 'CPV', name: 'Cape Verde',   group: 'H', confederation: 'CAF',      rating: 64, flag: '🇨🇻', fifaRanking: 71, keyPlayer: 'Garry Rodrigues',   style: 'Defensive',            isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2597/cape-verde' },
  { id: 'KSA', name: 'Saudi Arabia', group: 'H', confederation: 'AFC',      rating: 68, flag: '🇸🇦', fifaRanking: 58, keyPlayer: 'Salem Al-Dawsari',  style: 'High press',           isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/655/saudi-arabia' },
  { id: 'URU', name: 'Uruguay',      group: 'H', confederation: 'CONMEBOL', rating: 77, flag: '🇺🇾', fifaRanking: 13, keyPlayer: 'Darwin Núñez',      style: 'Gritty & clinical',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/212/uruguay' },
  // Group I
  { id: 'FRA', name: 'France',       group: 'I', confederation: 'UEFA',     rating: 88, flag: '🇫🇷', fifaRanking: 2,  keyPlayer: 'Kylian Mbappé',     style: 'Individual brilliance',isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/478/france' },
  { id: 'SEN', name: 'Senegal',      group: 'I', confederation: 'CAF',      rating: 74, flag: '🇸🇳', fifaRanking: 21, keyPlayer: 'Sadio Mané',        style: 'Athletic',             isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/654/senegal' },
  { id: 'IRQ', name: 'Iraq',         group: 'I', confederation: 'AFC',      rating: 65, flag: '🇮🇶', fifaRanking: 60, keyPlayer: 'Aymen Hussein',     style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/4375/iraq' },
  { id: 'NOR', name: 'Norway',       group: 'I', confederation: 'UEFA',     rating: 75, flag: '🇳🇴', fifaRanking: 33, keyPlayer: 'Erling Haaland',    style: 'Direct & powerful',    isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/464/norway' },
  // Group J
  { id: 'ARG', name: 'Argentina',    group: 'J', confederation: 'CONMEBOL', rating: 89, flag: '🇦🇷', fifaRanking: 1,  keyPlayer: 'Lionel Messi',      style: 'Clinical',             isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/202/argentina' },
  { id: 'ALG', name: 'Algeria',      group: 'J', confederation: 'CAF',      rating: 69, flag: '🇩🇿', fifaRanking: 52, keyPlayer: 'Riyad Mahrez',      style: 'Technical',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/624/algeria' },
  { id: 'AUT', name: 'Austria',      group: 'J', confederation: 'UEFA',     rating: 72, flag: '🇦🇹', fifaRanking: 26, keyPlayer: 'Marcel Sabitzer',   style: 'Pressing',             isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/474/austria' },
  { id: 'JOR', name: 'Jordan',       group: 'J', confederation: 'AFC',      rating: 64, flag: '🇯🇴', fifaRanking: 87, keyPlayer: 'Yazan Al-Naimat',   style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2917/jordan' },
  // Group K
  { id: 'POR', name: 'Portugal',     group: 'K', confederation: 'UEFA',     rating: 85, flag: '🇵🇹', fifaRanking: 9,  keyPlayer: 'Bruno Fernandes',   style: 'Attacking',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/482/portugal' },
  { id: 'COD', name: 'DR Congo',     group: 'K', confederation: 'CAF',      rating: 67, flag: '🇨🇩', fifaRanking: 57, keyPlayer: 'Chancel Mbemba',    style: 'Physical',             isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2850/dr-congo' },
  { id: 'UZB', name: 'Uzbekistan',   group: 'K', confederation: 'AFC',      rating: 65, flag: '🇺🇿', fifaRanking: 74, keyPlayer: 'Eldor Shomurodov',  style: 'Organized',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2570/uzbekistan' },
  { id: 'COL', name: 'Colombia',     group: 'K', confederation: 'CONMEBOL', rating: 78, flag: '🇨🇴', fifaRanking: 15, keyPlayer: 'Luis Díaz',         style: 'Pressing',             isDarkHorse: true,  squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/208/colombia' },
  // Group L
  { id: 'ENG', name: 'England',      group: 'L', confederation: 'UEFA',     rating: 84, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifaRanking: 4,  keyPlayer: 'Jude Bellingham',   style: 'Possession & press',   isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/448/england' },
  { id: 'CRO', name: 'Croatia',      group: 'L', confederation: 'UEFA',     rating: 77, flag: '🇭🇷', fifaRanking: 10, keyPlayer: 'Luka Modrić',       style: 'Tactical midfield',    isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/477/croatia' },
  { id: 'GHA', name: 'Ghana',        group: 'L', confederation: 'CAF',      rating: 67, flag: '🇬🇭', fifaRanking: 61, keyPlayer: 'Thomas Partey',     style: 'Athletic',             isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/4469/ghana' },
  { id: 'PAN', name: 'Panama',       group: 'L', confederation: 'CONCACAF', rating: 64, flag: '🇵🇦', fifaRanking: 79, keyPlayer: 'Rolando Blackburn', style: 'Defensive',            isDarkHorse: false, squadUrl: 'https://www.espn.com/soccer/team/squad/_/id/2659/panama' },
]

export function getGroupMatches(): Match[] {
  const matches: Match[] = []
  const groups = 'ABCDEFGHIJKL'.split('')

  for (const group of groups) {
    const teams = TEAMS.filter(t => t.group === group)
    const pairs = [
      [0, 1], [2, 3],
      [0, 2], [1, 3],
      [0, 3], [1, 2],
    ] as [number, number][]

    pairs.forEach(([a, b], i) => {
      const ratingDiff = teams[a].rating - teams[b].rating
      const xgHome = Math.max(0.5, 1.2 + ratingDiff * 0.03)
      const xgAway = Math.max(0.5, 1.2 - ratingDiff * 0.03)
      matches.push({
        id: `group-${group}-${i}`,
        stage: 'group',
        homeTeamId: teams[a].id,
        awayTeamId: teams[b].id,
        winnerId: null,
        xgHome: Math.round(xgHome * 10) / 10,
        xgAway: Math.round(xgAway * 10) / 10,
        completed: false,
      })
    })
  }

  return matches
}

export function getTeamById(id: string): Team | undefined {
  return TEAMS.find(t => t.id === id)
}
