import type { MonsterCard } from '@/lib/storage';

interface MonsterCardProps {
  card: MonsterCard;
  onDelete?: (id: string) => void;
}

const typeColors: Record<MonsterCard['type'], string> = {
  Grass: '#16a34a',
  Water: '#2563eb',
  Fire: '#ea580c',
  Bug: '#65a30d',
  Poison: '#9333ea',
  Normal: '#6b7280',
  Flying: '#0284c7',
};

const hpBarColor = (hp: number): string => {
  if (hp >= 80) return 'bg-green-400';
  if (hp >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
};

export default function MonsterCardComponent({ card, onDelete }: MonsterCardProps) {
  const hpPercent = Math.min((card.hp / 120) * 100, 100);
  const typeColor = typeColors[card.type] ?? '#6b7280';
  // Generate a zero-padded dex number from the card id (take last 3 hex digits converted to decimal mod 898 + 1)
  const dexNum = String((parseInt(card.id.replace(/-/g, '').slice(-3), 16) % 898) + 1).padStart(3, '0');

  return (
    <div className="group card-holographic flex flex-col rounded-lg overflow-hidden relative">
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={() => onDelete(card.id)}
          aria-label={`Delete ${card.monsterName}`}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-sm bg-black/70 text-slate-400 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all text-xs"
        >
          ✕
        </button>
      )}

      {/* Type banner */}
      <div
        className="w-full px-3 py-1 flex items-center justify-between"
        style={{ backgroundColor: typeColor }}
      >
        <span className="text-[8px] font-pixel text-white uppercase tracking-wider">{card.type}</span>
        <span className="text-[8px] font-mono text-white/70">#{dexNum}</span>
      </div>

      {/* Image */}
      <div className="relative w-full h-36 bg-[#060e18]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageBase64}
          alt={card.monsterName}
          className="w-full h-full object-cover opacity-90"
        />
        {/* vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-70 pointer-events-none" />
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 bg-[#0a1628]">
        {/* Monster name */}
        <h2 className="text-[10px] font-pixel text-[#e2f4ff] leading-relaxed">{card.monsterName}</h2>

        {/* Species */}
        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wide">
          SPECIES: <span className="italic normal-case text-slate-300">{card.realSpecies}</span>
        </p>

        {/* HP bar */}
        <div>
          <div className="flex items-center justify-between text-[8px] font-pixel text-slate-400 mb-1">
            <span>HP</span>
            <span>{card.hp}</span>
          </div>
          <div className="w-full h-2 bg-[#1a2744] rounded-none overflow-hidden border border-[#1e3a5f]">
            <div
              className={`h-full transition-all ${hpBarColor(card.hp)}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Skill */}
        <p className="text-[8px] font-pixel text-yellow-400">
          <span className="text-slate-500">SKILL:</span> {card.skill}
        </p>

        {/* Description */}
        <p className="text-[9px] font-mono text-slate-400 leading-relaxed italic">{card.description}</p>
      </div>
    </div>
  );
}
