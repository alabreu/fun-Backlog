import type { pt } from './pt'

/** English messages — o tipo força paridade de chaves com o pt. */
export const en: Record<keyof typeof pt, string> = {
  // Common
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.remove': 'Remove',

  // Header (the menu button lives at the top of the catalogue)
  'home.menuButton': 'Menu',
  'home.menuButtonUnread': 'Menu — unread news available',

  // Media (plural, as in filters and search groups)
  'media.game': 'Games',
  'media.movie': 'Movies',
  'media.series': 'Series',
  'media.anime': 'Anime',
  'media.book': 'Books',

  // Status — universal, and per medium where the word changes
  'status.backlog': 'In the queue',
  'status.paused': 'Paused',
  'status.abandoned': 'Dropped',
  'status.game.active': 'Playing',
  'status.game.done': 'Beaten',
  'status.movie.active': 'Watching',
  'status.movie.done': 'Watched',
  'status.series.active': 'Watching',
  'status.series.done': 'Finished',
  'status.anime.active': 'Watching',
  'status.anime.done': 'Finished',
  'status.book.active': 'Reading',
  'status.book.done': 'Read',

  // Catalogue (the shelf)
  'catalog.add': 'Add',
  'catalog.filterAll': 'All',
  'catalog.searchPlaceholder': 'Search your shelf',
  'catalog.count': '{count} of {total}',
  'catalog.emptyTitle': 'Your shelf is empty',
  'catalog.emptyBody':
    'Add the first game, movie, series, anime or book you want to get to.',
  'catalog.emptyAction': 'Add the first one',
  'catalog.noMatchTitle': 'Nothing matches',
  'catalog.noMatchBody': 'Try another medium, another status or another search.',
  'catalog.guestNote': 'Your items live on this device only. Sign in to sync.',
  'catalog.loadError': 'Could not load your shelf right now.',

  // Add item
  'add.title': 'Add',
  'add.searchLabel': 'Search',
  'add.searchPlaceholder': 'Type a title…',
  'add.searching': 'Searching…',
  'add.hint': 'Anime and books already work without signing in.',
  'add.needsLogin':
    'Games, movies and series will need sign-in to search — coming soon.',
  'add.someFailed': 'One of the sources did not answer. The rest is below.',
  'add.noResults': 'Nothing found for “{query}”.',
  'add.added': '“{title}” is on your shelf.',
  'add.addFailed': 'Could not add it. Try again.',
  'add.alreadyIn': 'Already on the shelf',
  'add.manualTitle': 'Not there? Add it by hand',
  'add.manualTitleLabel': 'Title',
  'add.manualTitlePlaceholder': 'Name of the game, movie, book…',
  'add.manualMediaLabel': 'Medium',
  'add.manualSubmit': 'Add to shelf',

  // Item (detail)
  'item.statusLabel': 'Status',
  'item.progressLabel': 'Progress',
  'item.progress.page': 'Page',
  'item.progress.episode': 'Episode',
  'item.progress.hour': 'Hours',
  'item.progressOf': 'of {total}',
  'item.ratingLabel': 'Rating',
  'item.ratingValue': '{value} of 5',
  'item.ratingClear': 'Clear rating',
  'item.notesLabel': 'Notes',
  'item.notesPlaceholder': 'What did you think? Where did you stop?',
  'item.addedAt': 'Added on {date}',
  'item.completedAt': 'Completed on {date}',
  'item.removeConfirm': 'Remove from the shelf?',
  'item.removed': 'Removed from the shelf.',
  'item.saveFailed': 'Could not save. Try again.',

  // Menu
  'menu.feedback': 'Send feedback',
  'menu.language': 'Language',
  'menu.news': "What's new",
  'menu.donate': 'Support the app',
  'menu.login': 'Sign in',

  // Auth
  'auth.title': 'Sign in',
  'auth.subtitle': 'Sign in to sync your data on any device.',
  'auth.google': 'Continue with Google',
  'auth.or': 'or',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signIn': 'Sign in',
  'auth.signUp': 'Create account',
  'auth.toSignUp': "No account? Create one",
  'auth.toSignIn': 'Already have an account? Sign in',
  'auth.guestNote': 'You can keep using the app without an account.',
  'auth.soon': 'Sign-in will be available soon.',
  'auth.error': "Couldn't sign in. Check your details and try again.",
  'auth.signedInAs': 'Signed in as',
  'auth.signOut': 'Sign out',

  // Feedback
  'feedback.title': 'Send feedback',
  'feedback.intro': 'Your feedback helps improve the app. Tell us what you think.',
  'feedback.typeLabel': 'Type',
  'feedback.type.bug': 'Bug',
  'feedback.type.idea': 'Idea',
  'feedback.type.other': 'Other',
  'feedback.messageLabel': 'Message',
  'feedback.messagePlaceholder': 'What happened? What could be better?',
  'feedback.emailLabel': 'Your email (optional)',
  'feedback.emailPlaceholder': 'so we can get back to you',
  'feedback.send': 'Send',
  'feedback.sentTitle': 'Thank you!',
  'feedback.sentBody': 'We received your feedback. 🙌',
  'feedback.sentMailBody': 'We opened your email with the feedback — just hit send. 🙌',
  'feedback.error': "Couldn't send right now. Try again in a moment.",
  'feedback.another': 'Send another',

  // Donations
  'donate.title': 'Support the app',
  'donate.body':
    'This app is free. If it helps you, a donation of any amount helps keep the servers and development going.',
  'donate.button': 'Make a donation',
  'donate.thanks': 'Every amount makes a difference. Thank you! 💜',
  'donate.soon': 'Donations will be available soon.',

  // Language
  'language.title': 'Language',
  'language.subtitle': 'Choose the app language.',

  // News (changelog)
  'news.title': "What's new",
  'news.subtitle': "What's new in the app.",
  'news.badgeNew': 'new',

  // Admin (operator panel — /admin)
  'admin.title': 'Admin',
  'admin.restricted': 'Restricted area.',
  'admin.users': 'Users',
  'admin.dau': 'DAU',
  'admin.wau': 'WAU',
  'admin.mau': 'MAU',
  'admin.feedback': 'Feedback',
  'admin.sessionsByDay': 'Sessions per day (30d)',
  'admin.noData': 'No data yet.',
  'admin.feedbackInbox': 'Feedback inbox',
  'admin.feedbackEmpty': 'No feedback yet.',

  // Update toast
  'update.available': 'New version available',
  'update.action': 'Update',
  'update.updating': 'Updating…',
  'update.dismiss': 'Dismiss',
}
