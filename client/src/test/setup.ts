// Global test setup. Individual specs create their own Pinia / router instances.

// jsdom does not implement scrolling; the router calls it on every navigation.
window.scrollTo = () => {}
