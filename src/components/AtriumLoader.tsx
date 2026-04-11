import { Link } from "react-router-dom";

const AtriumLoader = () => (
  <div className="min-h-screen bg-background">
    <div className="atrium-loader" />
  </div>
);

export const AtriumEmpty = ({ message = "No exhibitions found." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="mb-6 h-px w-16 bg-primary/40" />
    <p className="text-[15px] font-medium tracking-tight text-muted-foreground">{message}</p>
    <Link
      to="/"
      className="mt-6 text-[13px] font-medium tracking-tight text-primary hover:underline"
    >
      Return to the Gallery
    </Link>
  </div>
);

export default AtriumLoader;
