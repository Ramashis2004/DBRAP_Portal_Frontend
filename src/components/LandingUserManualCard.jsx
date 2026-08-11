import { useState } from "react";
import { Info, Download } from "lucide-react";
import { motion } from "framer-motion";
import { UserManualModal } from "./UserManualButton";
import { getPublicUserManualViewUrl, getPublicUserManualDownloadUrl } from "../api/api";

// Drop-in replacement for the User Manual card in LandingPage.jsx
function LandingUserManualCard() {
  const [open, setOpen]       = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState(false);

  const openModal = () => {
    setOpen(true);
    setLoaded(false);
    setError(false);
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={openModal}
 className="transparency-card glass p-6 cursor-pointer border-b-2 border-accent-gold mx-auto"
  style={{
    width: "400px",
    maxWidth: "90%",
  }}        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openModal(); }}
        aria-label="View User Manual"
      >
        <div className="w-12 h-12 rounded-full border border-accent-blue/20 flex items-center justify-center text-accent-blue">
          <Download size={24} />
        <span className="font-bold text-accent-blue"> User Manual</span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
            / Click to view / download PDF
        </span>
                </div>

      </motion.div>

      <UserManualModal
        open={open}
        onClose={() => setOpen(false)}
        viewUrl={open ? getPublicUserManualViewUrl() : ""}
        downloadUrl={getPublicUserManualDownloadUrl()}
        loaded={loaded}
        error={error}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
      />
    </>
  );
}

export default LandingUserManualCard;

