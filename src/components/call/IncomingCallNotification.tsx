import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { useUser } from '@/hooks/useUserCache'
import { subscribeToIncomingCalls, joinCall, declineCall } from '@/services/call.service'
import { Avatar } from '@/components/ui/Avatar'

export function IncomingCallNotification() {
  const { user } = useAuth()
  const { incomingCall, setIncomingCall, setActiveCallId, setActiveCallType } = useAppStore()

  useEffect(() => {
    if (!user?.uid) return
    return subscribeToIncomingCalls(user.uid, call => {
      if (!call) { setIncomingCall(null); return }
      setIncomingCall({ callId: call.id, initiatorId: call.initiatorId, type: call.type })
    })
  }, [user?.uid])

  const caller = useUser(incomingCall?.initiatorId ?? null)

  const handleAccept = async () => {
    if (!incomingCall || !user?.uid) return
    await joinCall(incomingCall.callId, user.uid)
    setActiveCallId(incomingCall.callId)
    setActiveCallType(incomingCall.type)
    setIncomingCall(null)
  }

  const handleDecline = async () => {
    if (!incomingCall || !user?.uid) return
    await declineCall(incomingCall.callId, user.uid)
    setIncomingCall(null)
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 right-4 z-[60] w-72 bg-pulse-bg-floating border border-white/10 rounded-2xl shadow-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <Avatar
              src={caller?.avatarUrl}
              name={caller?.displayName ?? ''}
              userId={incomingCall.initiatorId}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {caller?.displayName ?? 'Someone'} is calling
              </p>
              <p className="text-xs text-pulse-text-muted flex items-center gap-1">
                {incomingCall.type === 'video'
                  ? <><Video size={10} /> Video call</>
                  : <><Phone size={10} /> Voice call</>
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
            >
              <PhoneOff size={16} />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors"
            >
              {incomingCall.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
