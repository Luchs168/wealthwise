import { useStore } from '../store'

export function useAnsprache() {
  const { hasPartner, civilStatus } = useStore()
  const isPaar =
    hasPartner && (civilStatus === 'verheiratet' || civilStatus === 'partnerschaft')

  function t(singular: string, plural: string): string {
    return isPaar ? plural : singular
  }

  return { t, isPaar }
}
