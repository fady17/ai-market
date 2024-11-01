import SearchInput from "@/components/search-input";
// import { SignedIn, UserButton } from "@clerk/nextjs";
export default function Home() {
  return (
    <div className="h-full p-4 space-y-2">
      {/* <SignedIn>
        <UserButton afterSwitchSessionUrl="/" />
      </SignedIn> */}
      <SearchInput />
    </div>
  );
}
