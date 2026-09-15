import React from 'react';

const ShimmerBox: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = 20, borderRadius = 'var(--radius-sm)', style }) => (
  <div
    className="skeleton-shimmer"
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, var(--bg-subtle) 0%, var(--bg-surface) 50%, var(--bg-subtle) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.8s ease-in-out infinite',
      ...style,
    }}
  />
);

export const HeroSkeleton: React.FC = () => (
  <div
    className="card"
    style={{
      padding: '32px 36px',
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <ShimmerBox width={120} height={24} borderRadius="var(--radius-pill)" />
      <ShimmerBox width={160} height={24} borderRadius="var(--radius-pill)" />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 36, alignItems: 'center' }}>
      <div>
        <ShimmerBox width={180} height={60} borderRadius="var(--radius)" />
        <ShimmerBox width={260} height={28} borderRadius="var(--radius-sm)" style={{ marginTop: 12 }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <ShimmerBox width={90} height={20} />
          <ShimmerBox width={110} height={20} />
          <ShimmerBox width={80} height={20} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <ShimmerBox width={110} height={36} borderRadius="var(--radius-pill)" />
          <ShimmerBox width={110} height={36} borderRadius="var(--radius-pill)" />
          <ShimmerBox width={90} height={36} borderRadius="var(--radius-pill)" />
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          padding: 24,
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <ShimmerBox width="60%" height={16} />
        <ShimmerBox width="100%" height={8} borderRadius="var(--radius-pill)" />
        <ShimmerBox width="40%" height={14} />
      </div>
    </div>
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="kpi-grid">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="kpi-card"
        style={{
          padding: '22px 26px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <ShimmerBox width="50%" height={14} />
        <ShimmerBox width="70%" height={36} />
        <ShimmerBox width="85%" height={14} />
      </div>
    ))}
  </div>
);

export const QueueSkeleton: React.FC = () => (
  <div
    className="card"
    style={{
      padding: '24px 28px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
      <ShimmerBox width={160} height={20} />
      <ShimmerBox width={200} height={16} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            padding: 18,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <ShimmerBox width="40%" height={14} />
          <ShimmerBox width="60%" height={26} />
          <ShimmerBox width="80%" height={16} />
          <ShimmerBox width="100%" height={28} borderRadius="var(--radius-pill)" style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div
    className="card"
    style={{
      padding: '24px 28px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <ShimmerBox width={240} height={32} borderRadius="var(--radius-pill)" />
      <ShimmerBox width={200} height={32} borderRadius="var(--radius-pill)" />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <ShimmerBox width={90} height={20} />
          <ShimmerBox width={160} height={20} />
          <ShimmerBox width={100} height={20} />
          <ShimmerBox width={110} height={20} />
          <ShimmerBox width={80} height={22} borderRadius="var(--radius-pill)" />
          <ShimmerBox width={120} height={28} borderRadius="var(--radius-pill)" />
        </div>
      ))}
    </div>
  </div>
);

export const TimelineSkeleton: React.FC = () => (
  <div
    className="card"
    style={{
      padding: '24px 28px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <ShimmerBox width={140} height={20} />
      <ShimmerBox width={80} height={16} />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <ShimmerBox width={10} height={10} borderRadius="50%" style={{ marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ShimmerBox width="70%" height={16} />
            <ShimmerBox width="45%" height={12} />
          </div>
          <ShimmerBox width={45} height={14} />
        </div>
      ))}
    </div>
  </div>
);
