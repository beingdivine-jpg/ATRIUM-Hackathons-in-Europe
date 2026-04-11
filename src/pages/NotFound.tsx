import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-8 h-px w-12 bg-primary/40" />
      <h1 className="text-5xl font-extrabold tracking-tight text-foreground">404</h1>
      <p className="mt-4 text-[15px] font-medium tracking-tight text-muted-foreground">
        This wing doesn't exist in the Atrium.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center rounded-full border border-border px-6 py-2.5 text-[13px] font-medium tracking-tight text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
      >
        Return to the Gallery
      </Link>
    </div>
  );
};

export default NotFound;
