import React, { useEffect, useState } from "react";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import {
  Avatar,
  Button,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
} from "@mui/material";
import { Person, Logout } from "@mui/icons-material";
import avatarImg from "../assets/avatar.webp";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const Navbar = ({ open, setOpen }) => {
  const [date, setDate] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    const today = new Date();
    setDate(
      today.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout Successfully");
    navigate("/");
  };

  const getProfileRoute = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.role === "admin"
      ? "/admin/"
      : "/employee/profile";
  };


  return (
    <header className="bg-white shadow px-4 py-3 flex items-center justify-between">

      {/* Hamburger */}
      <button
        className="p-2 rounded hover:bg-gray-200/60"
        onClick={() => setOpen(!open)}
      >
        <MenuIcon size={26} />
      </button>

      {/* Title */}
      <h1 className="text-lg md:text-2xl font-semibold flex-1 text-center">
        Attendance
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-3 mr-4">

        {/* Date (desktop only) */}
        <span className="hidden md:block text-sm text-gray-500">
          {date}
        </span>

        {/* Avatar */}
        <div
          className="flex items-center gap-1 cursor-pointer select-none"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Avatar
            src={avatarImg}
            alt="Avatar"
            className="w-8 h-8"
          />
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${openMenu ? "rotate-180" : ""
              }`}
          />
        </div>


        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}

        >
          {/* User Info */}
          <div className="px-4 py-2">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          <Divider />

          {/* My Profile */}
          {/* <MenuItem
            onClick={() => {
              navigate("/employee/profile");
              setAnchorEl(null);
            }}
          >
            
          </MenuItem> */}
          <MenuItem
            onClick={() => {
              navigate(getProfileRoute());
              setAnchorEl(null);
            }}
          >
            {user.role !== "admin" && (
              <>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                My Profile
              </>
            )}
          </MenuItem>



          {/* Logout */}
          <MenuItem
            onClick={handleLogout}
            className="text-red-600"
          >
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

      </div>
    </header>
  );
};

export default Navbar;
