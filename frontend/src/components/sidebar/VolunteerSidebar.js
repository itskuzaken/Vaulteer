import { useState } from "react";
import { confirmLogout } from "../../services/auth/logout";
import {
  IoHomeOutline,
  IoDocumentTextOutline,
  IoEyeOutline,
  IoSettingsOutline,
  IoPersonOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

export default function Navigation({
  user,
  onContentChange,
  onSubContentChange,
  setUser,
}) {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedSubMenu, setSelectedSubMenu] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (menu) => {
    setSelectedMenu((prev) => (prev === menu ? null : menu));
  };

  const menus = {
    Overview: {
      icon: <IoHomeOutline className="mr-2 text-lg" />,
      subSections: [],
    },
    "HTS Form": {
      icon: <IoDocumentTextOutline className="mr-2 text-lg" />,
      subSections: ["Submit Form", "View Submitted"],
    },
    Settings: {
      icon: <IoSettingsOutline className="mr-2 text-lg" />,
      subSections: ["User & Account Settings", "Logout"],
    },
  };

  const subSectionIcons = {
    "Submit Form": <IoDocumentTextOutline className="mr-2 text-lg" />,
    "View Submitted": <IoEyeOutline className="mr-2 text-lg" />,
    "User & Account Settings": <IoPersonOutline className="mr-2 text-lg" />,
    Logout: <IoLogOutOutline className="mr-2 text-lg" />,
  };

  return (
    <div className="w-full bg-[#bb3031] text-white h-135 flex flex-col py-6 rounded-xl shadow-lg">
      {/* User Profile */}
      <div className="flex flex-col items-center mb-6">
        {user && user.photoURL ? (
          <img
            src={user.photoURL}
            alt="User Profile"
            className="w-20 h-20 rounded-full border-2 border-white mb-4"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/default-profile.png";
            }}
          />
        ) : (
          <div className="w-20 h-20 bg-gray-300 rounded-full mb-4 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
        <h2 className="text-lg font-bold mb-2">
          {user ? user.displayName : "Guest"}
        </h2>
        <p className="text-sm text-[#e0e0e0]">
          {user ? "Volunteer" : "Loading..."}
        </p>
      </div>

      {/* Dynamic Navigation Menu */}
      <nav className="w-full px-4 flex-1 transition-all duration-300 overflow-y-auto no-scrollbar">
        {Object.keys(menus).map((menu) => (
          <div
            key={menu}
            className={`mb-2 transition-all duration-300 ${
              selectedMenu === menu ? "h-auto" : "h-12"
            } overflow-hidden`}
          >
            <button
              className={`w-full text-left px-4 py-3 rounded-md transition-all duration-300 flex items-center ${
                selectedMenu === menu
                  ? "bg-white text-[#bb3031] font-bold"
                  : "hover:bg-[#e85a5b] hover:text-white"
              }`}
              onClick={() => {
                toggleMenu(menu);
                onContentChange(menu);
              }}
            >
              {menus[menu].icon}
              {menu}
            </button>
            {selectedMenu === menu && menus[menu].subSections.length > 0 && (
              <ul className="ml-4 mt-2">
                {menus[menu].subSections.map((subMenu) => (
                  <li key={subMenu} className="mb-2">
                    <button
                      className={`w-full text-left px-4 py-1.5 rounded-md transition-all duration-300 flex items-center ${
                        selectedSubMenu === subMenu
                          ? "bg-[#e85a5b] text-white"
                          : "hover:bg-[#e85a5b] hover:text-white"
                      }`}
                      onClick={() => {
                        if (subMenu === "Logout") {
                          setShowLogoutModal(true);
                        } else {
                          setSelectedSubMenu(subMenu);
                          onSubContentChange(subMenu);
                        }
                      }}
                    >
                      {subSectionIcons[subMenu] || (
                        <IoChevronForwardOutline className="mr-2 text-lg" />
                      )}
                      {subMenu}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl text-black font-bold mb-4">
              Confirm Logout
            </h2>
            <p className="mb-4 text-black">Are you sure you want to logout?</p>
            <div className="flex justify-end">
              <button
                className="bg-gray-300 text-black px-4 py-2 rounded mr-2"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={() => confirmLogout(setShowLogoutModal, setUser)}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
