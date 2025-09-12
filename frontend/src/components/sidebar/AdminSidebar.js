import { useState } from "react";
import { confirmLogout } from "../../services/auth/logout";
// Remove LogoutModal import
// import LogoutModal from "../modals/LogoutModal";
import {
  IoHomeOutline,
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoSettingsOutline,
  IoCreateOutline,
  IoCheckmarkDoneOutline,
  IoArchiveOutline,
  IoTimeOutline,
  IoMegaphoneOutline,
  IoEyeOutline,
  IoCheckmarkCircleOutline,
  IoAddCircleOutline,
  IoColorPaletteOutline,
  IoLogOutOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

export default function Navigation({
  user,
  onContentChange,
  onSubContentChange,
  setUser,
  selectedSubContent,
  // Remove showLogoutModal, setShowLogoutModal, onConfirm/onCancel props
}) {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedSubMenu, setSelectedSubMenu] = useState(null);
  // Remove showLogoutModal state from here
  // const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (menu) =>
    setSelectedMenu((prev) => (prev === menu ? null : menu));

  const menus = {
    Overview: {
      icon: <IoHomeOutline className="mr-2 text-lg" />,
      subSections: [],
    },
    "HTS Form": {
      icon: <IoDocumentTextOutline className="mr-2 text-lg" />,
      subSections: ["Form Submission"],
    },
    "Manage Post": {
      icon: <IoChatbubbleEllipsesOutline className="mr-2 text-lg" />,
      subSections: [
        "Create Post",
        "Published Posts",
        "Archived Posts",
        "Scheduled Posts",
        "Create Announcement",
      ],
    },
    "Manage Volunteer": {
      icon: <IoPeopleOutline className="mr-2 text-lg" />,
      subSections: ["View All Volunteers", "Application Approval"],
    },
    "Manage Staff": {
      icon: <IoPersonOutline className="mr-2 text-lg" />,
      subSections: ["View All Staff"],
    },
    "Manage Events": {
      icon: <IoCalendarOutline className="mr-2 text-lg" />,
      subSections: ["Create Event", "Published Events", "Archived Events"],
    },
    Settings: {
      icon: <IoSettingsOutline className="mr-2 text-lg" />,
      subSections: [
        "General Settings",
        "Appearance",
        "User & Account Settings",
        "Logout",
      ],
    },
  };

  const subSectionIcons = {
    "Form Submission": <IoDocumentTextOutline className="mr-2 text-lg" />,
    "Create Post": <IoCreateOutline className="mr-2 text-lg" />,
    "Published Posts": <IoCheckmarkDoneOutline className="mr-2 text-lg" />,
    "Archived Posts": <IoArchiveOutline className="mr-2 text-lg" />,
    "Scheduled Posts": <IoTimeOutline className="mr-2 text-lg" />,
    "Create Announcement": <IoMegaphoneOutline className="mr-2 text-lg" />,
    "View All Volunteers": <IoEyeOutline className="mr-2 text-lg" />,
    "Application Approval": (
      <IoCheckmarkCircleOutline className="mr-2 text-lg" />
    ),
    "View All Staff": <IoPeopleOutline className="mr-2 text-lg" />,
    "Create Event": <IoAddCircleOutline className="mr-2 text-lg" />,
    "Published Events": <IoCheckmarkDoneOutline className="mr-2 text-lg" />,
    "Archived Events": <IoArchiveOutline className="mr-2 text-lg" />,
    "General Settings": <IoSettingsOutline className="mr-2 text-lg" />,
    Appearance: <IoColorPaletteOutline className="mr-2 text-lg" />,
    "User & Account Settings": <IoPersonOutline className="mr-2 text-lg" />,
    Logout: <IoLogOutOutline className="mr-2 text-lg" />,
  };

  return (
    <div className="w-full bg-[#bb3031] text-white h-screen flex flex-col py-6 rounded-xl">
      {/* User Profile */}
      <div className="flex flex-col items-center mb-6">
        {user?.photoURL ? (
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
          {user ? "Admin" : "Loading..."}
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
                        selectedSubMenu === subMenu ||
                        selectedSubContent === subMenu
                          ? "bg-[#e85a5b] text-white"
                          : "hover:bg-[#e85a5b] hover:text-white"
                      }`}
                      onClick={() => {
                        if (subMenu === "Logout") {
                          if (
                            typeof window !== "undefined" &&
                            window.setAdminShowLogoutModal
                          ) {
                            window.setAdminShowLogoutModal(true);
                          }
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
    </div>
  );
}
