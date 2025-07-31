import LoadingSpinner from "@/components/LoadingSpinner";

export default function Loading() {
  // Tampilkan spinner Anda sebagai fallback saat halaman memuat.
  // Anda bisa membuat UI yang lebih kompleks seperti skeleton layout di sini.
  return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex justify-center items-center z-50">
          <LoadingSpinner />
      </div>
  );
}