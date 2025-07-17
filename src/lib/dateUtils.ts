// Date formatting utilities for UK format (dd/mm/yyyy)

export const formatDateUK = (dateString: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatDateTimeUK = (dateString: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatTimeUK = (dateString: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDateShortUK = (dateString: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  }).replace(/\./g, '') // Remove dots to match "23 July" format
}

export const formatMonthYearUK = (dateString: string | Date): string => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleDateString('en-GB', { 
    month: 'short', 
    year: 'numeric' 
  })
} 