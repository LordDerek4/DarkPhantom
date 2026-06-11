import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Users, MessageSquare, Zap, Activity, Award, Heart } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { getServerAnalyticsHistory, computeServerAnalytics, computeCommunityHealth } from '@/services/analytics.service'
import type { ServerAnalytics, CommunityHealth } from '@/types/extended'

interface AnalyticsDashboardProps {
  serverId: string
}

function StatCard({ icon, label, value, trend, trendValue }: {
  icon: React.ReactNode, label: string, value: string | number, trend?: 'up' | 'down' | 'neutral', trendValue?: string
}) {
  return (
    <div className="bg-pulse-bg-secondary rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-pulse-text-muted">{icon}</div>
        {trend && trendValue && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-pulse-text-muted')}>
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-pulse-text-normal">{value}</p>
        <p className="text-xs text-pulse-text-muted">{label}</p>
      </div>
    </div>
  )
}

function HealthScore({ health }: { health: CommunityHealth }) {
  const color = health.score >= 70 ? 'text-green-400' : health.score >= 40 ? 'text-yellow-400' : 'text-red-400'
  const bgColor = health.score >= 70 ? 'bg-green-400/10' : health.score >= 40 ? 'bg-yellow-400/10' : 'bg-red-400/10'

  return (
    <div className="bg-pulse-bg-secondary rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-pulse-text-normal flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          Community Health
        </h3>
        <div className={cn('px-3 py-1 rounded-full text-sm font-bold', bgColor, color)}>
          {health.score}/100
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {[
          { label: 'Participation', value: health.participationScore },
          { label: 'Growth', value: health.growthScore },
          { label: 'Safety', value: health.toxicityScore },
          { label: 'Retention', value: health.retentionScore },
          { label: 'Moderation', value: health.moderationScore },
        ].map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-pulse-text-muted">{label}</span>
              <span className="text-pulse-text-normal font-medium">{Math.round(value)}</span>
            </div>
            <div className="h-1.5 bg-pulse-bg-primary rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', value >= 70 ? 'bg-green-400' : value >= 40 ? 'bg-yellow-400' : 'bg-red-400')}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {health.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-pulse-text-muted uppercase tracking-wide">Recommendations</p>
          {health.recommendations.map((r, i) => (
            <p key={i} className="text-xs text-pulse-text-muted flex gap-2">
              <span className="text-pulse-brand">→</span>{r}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function AnalyticsDashboard({ serverId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ServerAnalytics[]>([])
  const [health, setHealth] = useState<CommunityHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    load()
  }, [serverId])

  const load = async () => {
    setLoading(true)
    const [hist, h] = await Promise.all([
      getServerAnalyticsHistory(serverId),
      computeCommunityHealth(serverId),
    ])
    setAnalytics(hist)
    setHealth(h)
    setLoading(false)
  }

  const refresh = async () => {
    setRefreshing(true)
    await computeServerAnalytics(serverId)
    await load()
    setRefreshing(false)
  }

  const latest = analytics[analytics.length - 1]
  const prev = analytics[analytics.length - 2]

  const chartData = analytics.map((a, i) => ({
    day: `Day ${i + 1}`,
    messages: a.totalMessages,
    dau: a.dau,
    velocity: Math.round(a.messageVelocity * 10) / 10,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-pulse-brand border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 overflow-y-auto h-full scrollbar-thin">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-pulse-text-normal flex items-center gap-2">
          <Activity size={18} className="text-pulse-brand" />
          Analytics
        </h2>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-xs text-pulse-brand hover:text-pulse-brand-hover disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users size={16} />} label="Daily Active Users" value={latest?.dau ?? 0}
          trend={latest && prev ? (latest.dau > prev.dau ? 'up' : 'down') : 'neutral'}
          trendValue={latest && prev ? `${Math.abs(latest.dau - prev.dau)}` : undefined}
        />
        <StatCard icon={<MessageSquare size={16} />} label="Messages Today" value={latest?.totalMessages ?? 0}
          trend={latest && prev ? (latest.totalMessages > prev.totalMessages ? 'up' : 'down') : 'neutral'}
          trendValue={latest && prev ? `${Math.abs(latest.totalMessages - prev.totalMessages)}` : undefined}
        />
        <StatCard icon={<Zap size={16} />} label="Msg Velocity /hr" value={latest ? `${(latest.messageVelocity).toFixed(1)}` : '0'} />
        <StatCard icon={<Award size={16} />} label="Active Channels" value={latest?.activeChannels.length ?? 0} />
      </div>

      {/* Message trend */}
      {chartData.length > 0 && (
        <div className="bg-pulse-bg-secondary rounded-xl p-4">
          <h3 className="text-sm font-semibold text-pulse-text-normal mb-3">Message Activity</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5865F2" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#5865F2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#72767d', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#72767d', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#2f3136', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="messages" stroke="#5865F2" fill="url(#msgGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* DAU chart */}
      {chartData.length > 0 && (
        <div className="bg-pulse-bg-secondary rounded-xl p-4">
          <h3 className="text-sm font-semibold text-pulse-text-normal mb-3">Daily Active Users</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#72767d', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#72767d', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#2f3136', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="dau" fill="#57F287" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top contributors */}
      {latest?.topContributors.length > 0 && (
        <div className="bg-pulse-bg-secondary rounded-xl p-4">
          <h3 className="text-sm font-semibold text-pulse-text-normal mb-3">Top Contributors Today</h3>
          <div className="space-y-2">
            {latest.topContributors.slice(0, 5).map((c, i) => (
              <div key={c.userId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-pulse-text-muted w-4">#{i + 1}</span>
                <div className="flex-1 h-1.5 bg-pulse-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pulse-brand rounded-full"
                    style={{ width: `${(c.messageCount / latest.topContributors[0].messageCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-pulse-text-muted w-8 text-right">{c.messageCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health */}
      {health && <HealthScore health={health} />}
    </div>
  )
}
