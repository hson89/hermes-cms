export const getStatusBadgeColor = (status: string): 'success' | 'danger' | 'gold' | 'neutral' => {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'pending') return 'gold'
  return 'neutral'
}
