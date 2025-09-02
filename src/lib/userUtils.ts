// User display utilities for consistent formatting across the application

export const formatUserDisplayName = (user: any): string => {
  if (!user) return 'Unknown User'
  
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  
  if (user.name) {
    return user.name
  }
  
  return user.email || 'Unknown User'
}

export const formatUsersListDisplay = (users: any[]): string => {
  if (!users || users.length === 0) return 'No users assigned'
  
  return users.map(user => formatUserDisplayName(user)).join(', ')
}

export const formatUserDisplayNameWithEmail = (user: any): string => {
  if (!user) return 'Unknown User'
  
  const displayName = formatUserDisplayName(user)
  
  if (user.email && displayName !== user.email) {
    return `${displayName} (${user.email})`
  }
  
  return displayName
} 