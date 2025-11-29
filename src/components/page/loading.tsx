import { Spinner } from "../ui/spinner";

export function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center flex flex-col items-center gap-4">
        <Spinner className="size-12" />
      </div>
    </div>
  );
}