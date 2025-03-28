export interface AuthResponse {
    message: string;
    accessToken: string;
    user: User;
  }
  
  export interface Address {
    street: string;
    block: string;
    lot: string;
    city: string;
    phase: string;
  }
  
  export interface Homeowner {
    fileUrl: string;
    data: Homeowner | null;
    _id: string;
    accountnumber: string;
    firstname: string;
    middlename: string;
    lastname: string;
    email: string;
    age: number;
    role: string;
    phone: string;
    moveInDate: Date;
    qrCode: string;
    address: Address;
  }
  
  export interface HomeownerResponse {
    message: string;
    data: {
      homeowners: Homeowner[];
      totalHomeowners: number;
      pagination: Pagination;
    };
  }
  
  export interface SuperAdmin {
    _id: string;
    fullName: string;
  }
  
  export interface SuperAdminResponse {
    message: string;
    data: {
      superadmins: User[];
      totalSuperAdmins: number;
      pagination: Pagination[];
    };
  }
  
  export interface User {
    permissions: any;
    _id: string;
    email: string;
    username?: string;
    role: string;
    lastLogin?: Date;
    fullName: string;
  }
  
  export interface AdminResponse {
    message: string;
    data: {
      admins: User[];
      totalAdmins: number;
      pagination: Pagination[]
    };
  }
  
  export interface AuditLog {
    _id: string;
    action: string;
    performedBy: {
      username: any;
      _id: string;
      email?: string;
      role: string;
    };
    targetUser: {
      _id: string;
      email: string;
      role: string;
    };
    details: any;
    timestamp: Date;
    status: string;
    ipAddress: string;
    userAgent: string;
  }
  
  export interface Pagination {
    total: number;
    page: number;
    pages: number;
    limit: number;
  }
  