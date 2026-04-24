const User = require('../models/User.js');

const DEFAULT_ADMIN_EMAIL = 'admin@hostel.sliit.lk';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

const ensureDefaultAdmin = async () => {
    const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
    if (existingAdmin) {
        return existingAdmin;
    }

    const admin = await User.create({
        name: 'System Administrator',
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
        phoneNumber: '0110000000',
        accountStatus: 'verified'
    });

    console.log(`Default admin created: ${admin.email}`);
    return admin;
};

module.exports = { ensureDefaultAdmin };
