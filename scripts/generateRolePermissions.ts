// scripts/generateRolePermissions.ts
import { supabase } from '../src/lib/supabaseClient';
import { writeFileSync } from 'fs';
import path from 'path';

const outputFile = path.resolve(__dirname, '../src/constants/rolePermissions.ts');

async function generateRolePermissions() {
  const { data, error } = await supabase.from('rolepermissions').select('*');

  if (error) {
    console.error('Error fetching rolepermissions:', error.message);
    return;
  }

  const entries = data.map((item) => {
    return `  ${item.role}: {
    canCreateTickets: ${JSON.stringify(item.can_create_tickets || [])},
    canViewTickets: ${item.can_view_tickets ?? false},
    canEditTickets: ${item.can_edit_tickets ?? false},
    canResolveTickets: ${item.can_resolve_tickets ?? false},
    canEscalateTickets: ${item.can_escalate_tickets ?? false},
    canViewClients: ${item.can_view_clients ?? false},
    canManageUsers: ${item.can_manage_users ?? false},
    canViewReports: ${item.can_view_reports ?? false},
    canOnboardClients: ${item.can_onboard_clients ?? false}
  }`;
  });

  const content = `import { RolePermissions, UserRole } from '../types/role';

export const rolePermissions: Record<UserRole, RolePermissions> = {
${entries.join(',\n')}
};
`;

  writeFileSync(outputFile, content);
  console.log(`✅ Generated rolePermissions.ts`);
}

generateRolePermissions();
