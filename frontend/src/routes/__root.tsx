import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/stores/auth";
import { authService } from "@/services/mockApi";
import { toast } from "sonner";
import { wsManager } from "@/services/websocket";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <pre className="mt-4 text-xs text-left bg-muted p-4 rounded overflow-auto max-h-40 text-destructive-foreground">
          {error.message || String(error)}
          {"\n\n"}
          {error.stack}
        </pre>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "fakebook — Social, reimagined" },
      { name: "description", content: "fakebook is a modern social network for communities, conversations, and connection." },
      { property: "og:title", content: "fakebook — Social, reimagined" },
      { property: "og:description", content: "fakebook is a modern social network for communities, conversations, and connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { signIn, signOut } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Verify session on mount
    authService
      .me()
      .then((u) => {
        signIn(u);
      })
      .catch(() => {
        signOut();
        const path = window.location.pathname;
        if (path !== "/login" && path !== "/register" && path !== "/forgot-password") {
          navigate({ to: "/login" });
        }
      });
  }, [signIn, signOut, navigate]);

  const isAuthed = useAuthStore((s) => s.isAuthed);

  useEffect(() => {
    if (!isAuthed) return;

    const unsubscribe = wsManager.subscribe((payload) => {
      if (payload.type === "notification") {
        toast.info(payload.data.text);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
      } else if (payload.type === "message") {
        const data = payload.data;
        const currentPath = window.location.pathname;
        const isCurrentThread = currentPath === `/messages/${data.conversationId}` || currentPath === `/messages/${data.authorId}`;
        if (!isCurrentThread) {
          toast.info(`New message: ${data.text.slice(0, 30)}${data.text.length > 30 ? "..." : ""}`);
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
        queryClient.invalidateQueries({ queryKey: ["messages", data.authorId] });
      }
    });

    return () => unsubscribe();
  }, [isAuthed, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SonnerToaster />
    </QueryClientProvider>
  );
}
