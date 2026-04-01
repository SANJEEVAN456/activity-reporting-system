export function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username || '',
    profilePicture: user.profilePicture || '',
    role: user.role,
    active: user.active,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    lastLoginAt: user.lastLoginAt || null,
    loginHistory: (user.loginHistory || []).map((entry) => ({
      loggedInAt: entry.loggedInAt || null,
      ip: entry.ip || '',
      userAgent: entry.userAgent || '',
    })),
    joinedAt: user.joinedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function serializeAuthUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username || '',
    profilePicture: user.profilePicture || '',
    role: user.role,
    active: user.active,
    joinedAt: user.joinedAt,
    createdAt: user.createdAt,
  }
}

export function serializeReport(report) {
  const user = report.user && typeof report.user === 'object' ? report.user : null
  return {
    id: report._id.toString(),
    date: report.date,
    activity: report.activity,
    eventName: report.eventName || '',
    eventImageUrl: report.eventImageUrl || '',
    reportType: report.reportType || 'activity',
    duration: report.duration,
    description: report.description,
    status: report.status,
    upcoming: report.upcoming,
    completedAt: report.completedAt,
    readyForApproval: report.readyForApproval,
    submitted: report.submitted,
    submittedForReview: report.submittedForReview,
    reviewStatus: report.reviewStatus,
    reviewSuggestion: report.reviewSuggestion,
    adminComment: report.adminComment,
    reviewActionAt: report.reviewActionAt,
    deletedByAdmin: report.deletedByAdmin,
    archivedByUserDeletion: report.archivedByUserDeletion,
    archivedAt: report.archivedAt,
    archivedUserName: report.archivedUserName || '',
    archivedUserEmail: report.archivedUserEmail || '',
    exported: report.exported,
    exportedAt: report.exportedAt,
    eventAttachments: (report.eventAttachments || []).map((item) => ({
      id: item._id?.toString?.() || '',
      filename: item.filename,
      originalName: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      url: item.url,
      uploadedAt: item.uploadedAt,
    })),
    user: user?.email || report.archivedUserEmail || report.userEmail || '',
    userName: user?.name || report.archivedUserName || '',
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
}
