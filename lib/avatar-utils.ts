export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return '??'; // Default placeholder if no name is provided
  }
  
  const nameParts = name.split(' ').filter(part => part.length > 0);
  
  if (nameParts.length === 0) {
    return '??';
  }
  
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  // For multiple names, use first and last name initials
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

export function generateAvatarColor(name: string | null | undefined): string {
  if (!name) return '#6B7280'; // Default gray color
  
  // Generate a consistent color based on the name
  const colors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#F59E0B', // Amber
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
