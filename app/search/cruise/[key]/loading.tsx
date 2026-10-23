import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseDetailSkeleton from "@/components/cruise-search/CruiseDetailSkeleton";

export default function CruiseDetailLoading() {
  return (
    <>
      <Header forceSolid />
      <CruiseDetailSkeleton />
      <Footer />
    </>
  );
}
