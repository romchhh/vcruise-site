import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseSearchSkeleton from "@/components/cruise-search/CruiseSearchSkeleton";

export default function SearchLoading() {
  return (
    <>
      <Header forceSolid />
      <CruiseSearchSkeleton />
      <Footer />
    </>
  );
}
