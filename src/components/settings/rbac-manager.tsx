'use client';

/**
 * RBAC Management UI Component
 * Role-Based Access Control with visual permission management
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Search,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ============================================
// Types
// ============================================

interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: Role;
  status: string;
}

// ============================================
// Dummy Data
// ============================================

const modules = [
  'dashboard',
  'tasks',
  'clients',
  'transactions',
  'trading',
  'ib',
  'kyc',
  'reports',
  'settings',
  'users',
  'notifications',
  'audit',
];

const actions = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];

const dummyPermissions: Permission[] = modules.flatMap((module) =>
  actions.map((action) => ({
    id: `${module}_${action}`,
    name: `${module}:${action}`,
    module,
    action,
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
  }))
);

const dummyRoles: Role[] = [
  {
    id: 'role_1',
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 100,
    permissions: dummyPermissions,
    userCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_2',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    level: 80,
    permissions: dummyPermissions.filter((p) => !p.name.includes('audit:delete')),
    userCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_3',
    name: 'finance_manager',
    displayName: 'Finance Manager',
    description: 'Financial operations and reporting',
    level: 60,
    permissions: dummyPermissions.filter(
      (p) =>
        ['transactions', 'clients', 'reports', 'dashboard', 'notifications'].includes(p.module)
    ),
    userCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_4',
    name: 'support_agent',
    displayName: 'Support Agent',
    description: 'Client support and task management',
    level: 40,
    permissions: dummyPermissions.filter(
      (p) =>
        ['tasks', 'clients', 'notifications', 'dashboard'].includes(p.module) &&
        ['read', 'update'].includes(p.action)
    ),
    userCount: 15,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role_5',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to reports',
    level: 20,
    permissions: dummyPermissions.filter(
      (p) => p.action === 'read' && ['dashboard', 'reports'].includes(p.module)
    ),
    userCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const dummyUsers: User[] = [
  { id: 'u1', name: 'John Smith', email: 'john@omnicrm.com', role: dummyRoles[0], status: 'ACTIVE' },
  { id: 'u2', name: 'Sarah Connor', email: 'sarah@omnicrm.com', role: dummyRoles[2], status: 'ACTIVE' },
  { id: 'u3', name: 'Mike Johnson', email: 'mike@omnicrm.com', role: dummyRoles[3], status: 'ACTIVE' },
  { id: 'u4', name: 'Emily Davis', email: 'emily@omnicrm.com', role: dummyRoles[1], status: 'ACTIVE' },
  { id: 'u5', name: 'Alex Turner', email: 'alex@omnicrm.com', role: dummyRoles[3], status: 'SUSPENDED' },
];

// ============================================
// RBAC Manager Component
// ============================================

export function RBACManager() {
  const [roles, setRoles] = useState<Role[]>(dummyRoles);
  const [users, setUsers] = useState<User[]>(dummyUsers);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('roles');
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const { toast } = useToast();

  // Filter roles based on search
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const savePermissions = () => {
    if (!selectedRole) return;
    toast({
      title: 'Permissions Updated',
      description: `Permissions for ${selectedRole.displayName} have been saved.`,
    });
    setIsEditingPermissions(false);
  };

  const assignRoleToUser = (userId: string, roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );

    toast({
      title: 'Role Assigned',
      description: `User has been assigned the ${role.displayName} role.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Access Control</h2>
          <p className="text-muted-foreground">
            Manage roles and permissions for your team
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with custom permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input id="role-name" placeholder="e.g., sales_manager" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input id="display-name" placeholder="e.g., Sales Manager" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level (0-100)</Label>
                <Input id="level" type="number" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Role description..." />
              </div>
            </div>
            <DialogFooter>
              <Button>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-sm text-muted-foreground">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Key className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dummyPermissions.length}</p>
                <p className="text-sm text-muted-foreground">Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter((u) => u.status === 'ACTIVE').length}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Role List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Roles</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {filteredRoles.map((role) => (
                      <button
                        key={role.id}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                          selectedRole?.id === role.id && 'bg-muted'
                        )}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{role.displayName}</span>
                          <Badge variant="outline">Level {role.level}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {role.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {role.userCount} users • {role.permissions.length} permissions
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Role Details */}
            <Card className="lg:col-span-2">
              {selectedRole ? (
                <>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedRole.displayName}</CardTitle>
                        <CardDescription>{selectedRole.name}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingPermissions(!isEditingPermissions)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Permissions
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Level</Label>
                          <p className="font-medium">{selectedRole.level}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Users</Label>
                          <p className="font-medium">{selectedRole.userCount}</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-muted-foreground mb-2 block">
                          Permissions ({selectedRole.permissions.length})
                        </Label>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-4">
                            {modules.map((module) => {
                              const modulePermissions = selectedRole.permissions.filter(
                                (p) => p.module === module
                              );
                              if (modulePermissions.length === 0) return null;

                              return (
                                <div key={module} className="space-y-2">
                                  <p className="font-medium capitalize">{module}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {modulePermissions.map((p) => (
                                      <Badge
                                        key={p.id}
                                        variant="secondary"
                                        className="capitalize"
                                      >
                                        {p.action}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>

                      {isEditingPermissions && (
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditingPermissions(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={savePermissions}>Save Changes</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a Role</p>
                  <p className="text-sm">Choose a role from the list to view details</p>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {user.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={user.role?.id}
                        onValueChange={(roleId) => assignRoleToUser(user.id, roleId)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge
                        className={cn(
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>
                View all permissions across all roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Module</th>
                        <th className="text-left p-2 font-medium">Action</th>
                        {roles.map((role) => (
                          <th key={role.id} className="text-center p-2 font-medium">
                            {role.displayName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((module) =>
                        actions.map((action, idx) => (
                          <tr key={`${module}_${action}`} className="border-b hover:bg-muted/50">
                            {idx === 0 && (
                              <td
                                rowSpan={actions.length}
                                className="p-2 font-medium capitalize border-r"
                              >
                                {module}
                              </td>
                            )}
                            <td className="p-2 capitalize">{action}</td>
                            {roles.map((role) => {
                              const hasPermission = role.permissions.some(
                                (p) => p.module === module && p.action === action
                              );
                              return (
                                <td key={role.id} className="text-center p-2">
                                  {hasPermission ? (
                                    <Check className="h-4 w-4 mx-auto text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 mx-auto text-muted-foreground" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
