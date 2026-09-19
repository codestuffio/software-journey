import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Software Journey" },
      {
        name: "description",
        content: "Understand the story behind a codebase.",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
  component: Root,
  notFoundComponent: () => (
    <main>
      <h1>Page not found</h1>
      <a href="/">Go home</a>
    </main>
  ),
});

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
