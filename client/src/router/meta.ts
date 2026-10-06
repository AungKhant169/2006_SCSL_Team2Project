import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Guests are redirected to the login page (REQ-2.17, BR-2). */
    requiresAuth?: boolean
    /** Banner shown on the login page after redirecting a guest away from this route. */
    authMessage?: string
    /** Only accounts with the Admin role may open the route (REQ-5.7, BR-5). */
    requiresAdmin?: boolean
    /** Already signed-in users are sent to the directory instead (login page). */
    guestOnly?: boolean
  }
}
