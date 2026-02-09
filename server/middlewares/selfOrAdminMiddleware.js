module.exports = (req, res, next) => {
    const loggedInUser = req.user; // set by auth middleware
    const targetEmpId = req.params.emp_id;
  
    if (!loggedInUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    const isAdmin = loggedInUser.role === "admin";
    const isSelf = String(loggedInUser.emp_id) === String(targetEmpId);
  
    if (isAdmin || isSelf) {
      return next();
    }
  
    return res.status(403).json({ message: "Access denied" });
  };
  