/**
 * commandParser.ts - Parse and execute CLI commands with enhancements
 * Features: Case-Insensitive, Aliases, Fuzzy Matching, Custom Responses
 * ✅ NOW USES tuApiService for authenticated API calls
 */

import { tuApiService } from '../api/tu-service';

export interface CommandResult {
  success: boolean;
  output: string;
  data?: any;
}

// Command aliases mapping
const COMMAND_ALIASES: Record<string, string> = {
  's --f': 'super --fetch ideas',
  's --u': 'super --list users',
  's --s': 'super --stats',
  's --h': 'super --help',
};

// All valid commands for fuzzy matching
const VALID_COMMANDS = [
  'super --help',
  'super --fetch ideas',
  'super --list users',
  'super --delete idea',
  'super --set-power',
  'super --stats',
  'help',
];

export class CommandParser {
  /**
   * Compute Levenshtein distance between two strings
   * Used for fuzzy command matching
   */
  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Find the closest matching command for typo suggestions
   */
  private static findClosestCommand(input: string): string | null {
    let closestCommand: string | null = null;
    let minDistance = 4; // Threshold for suggestion

    VALID_COMMANDS.forEach((cmd) => {
      const distance = this.levenshteinDistance(input.toLowerCase(), cmd);
      if (distance < minDistance) {
        minDistance = distance;
        closestCommand = cmd;
      }
    });

    return closestCommand;
  }

  /**
   * Expand command aliases (s --f → super --fetch ideas)
   */
  private static expandAlias(input: string): string {
    const lowerInput = input.toLowerCase().trim();
    return COMMAND_ALIASES[lowerInput] || lowerInput;
  }

  /**
   * Normalize and process command (case-insensitive)
   */
  static async parseCommand(input: string): Promise<CommandResult> {
    const trimmed = input.trim();

    // Step 1: Expand aliases
    let normalizedCommand = this.expandAlias(trimmed);

    // Step 2: Convert to lowercase for case-insensitive matching
    const lowerCommand = normalizedCommand.toLowerCase();

    // Super --help
    if (lowerCommand === 'super --help' || lowerCommand === 'help') {
      return this.getHelpMenu();
    }

    // Super --fetch ideas
    if (lowerCommand === 'super --fetch ideas') {
      const result = await this.fetchIdeas();
      if (result.success) {
        // Add success prefix to output
        result.output = `✅ [SUCCESS] Command executed: super --fetch ideas\n${result.output}`;
      }
      return result;
    }

    // Super --list users
    if (lowerCommand === 'super --list users') {
      const result = await this.listUsers();
      if (result.success) {
        result.output = `✅ [SUCCESS] Command executed: super --list users\n${result.output}`;
      }
      return result;
    }

    // Super --delete idea [ID]
    if (lowerCommand.startsWith('super --delete idea ')) {
      const id = lowerCommand.replace('super --delete idea ', '').trim();
      return this.deleteIdea(id);
    }

    // Super --set-power [Email] [Level]
    if (lowerCommand.startsWith('super --set-power ')) {
      const args = lowerCommand.replace('super --set-power ', '').trim().split(' ');
      if (args.length < 2) {
        return {
          success: false,
          output: '❌ Error: Missing arguments\nUsage: super --set-power [Email] [Level]',
        };
      }
      return this.setPower(args[0], parseInt(args[1]));
    }

    // Super --stats
    if (lowerCommand === 'super --stats') {
      const result = await this.getStats();
      if (result.success) {
        result.output = `✅ [SUCCESS] Command executed: super --stats\n${result.output}`;
      }
      return result;
    }

    // Step 3: Unknown command - try to find suggestion
    const closestCommand = this.findClosestCommand(normalizedCommand);
    let errorOutput = `❌ Command not found: "${trimmed}"\n`;

    if (closestCommand) {
      errorOutput += `\n💡 Did you mean: ${closestCommand}?`;
    } else {
      errorOutput += `Type "super --help" for available commands`;
    }

    return {
      success: false,
      output: errorOutput,
    };
  }

  private static getHelpMenu(): CommandResult {
    const help = `
✅ [SUCCESS] Command executed: super --help

╔════════════════════════════════════════════════════════════════╗
║          🚀 SUPREME CLI - Command Reference                    ║
║     (Case-Insensitive • Aliases Supported)                     ║
╚════════════════════════════════════════════════════════════════╝

📋 AVAILABLE COMMANDS:

  super --help                       Show this help menu
  super --fetch ideas                Fetch all ideas with details
  super --list users                 List all users with power levels
  super --delete idea [ID]           Delete an idea by ID
  super --set-power [Email] [Level]  Set user power level (1-20)
  super --stats                      Show system statistics

⚡ QUICK ALIASES (Shortcuts):

  s --h                              super --help
  s --f                              super --fetch ideas
  s --u                              super --list users
  s --s                              super --stats

🎯 EXAMPLES:

  super --fetch ideas               (full command)
  s --f                             (using alias)
  SUPER --STATS                     (case-insensitive)
  super --delete idea 550e8400...
  super --set-power admin@test.com 18

💡 POWER LEVELS:
  1  = Viewer       | 5  = Contributor  | 10 = QA Coordinator
  15 = QA Manager   | 18 = Admin        | 20 = SuperAdmin

💡 FEATURES:
  • Commands are case-insensitive (Super, super, SUPER all work)
  • Typos are detected with smart suggestions
  • Command history with ↑↓ arrow keys

═══════════════════════════════════════════════════════════════════`;

    return {
      success: true,
      output: help,
    };
  }

  private static async fetchIdeas(): Promise<CommandResult> {
    try {
      const response = await tuApiService.get('/ideas'); // ✅ Uses JWT interceptor
      // Handle both { data: [...] } and direct [...] response formats
      const ideas = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (!Array.isArray(ideas) || ideas.length === 0) {
        return {
          success: true,
          output: '✅ [SUCCESS] Command executed: super --fetch ideas\n✅ No ideas found',
          data: ideas,
        };
      }

      let output = '\n📋 IDEAS LIST:\n';
      output += '┌─────────────────────────────────────────────────────────────────────────┐\n';
      output += '│ ID                                   │ Title                  │ Status  │\n';
      output += '├─────────────────────────────────────────────────────────────────────────┤\n';

      ideas.forEach((idea: any) => {
        const id = (idea._id || idea.id || 'N/A').substring(0, 8);
        const title = (idea.title || 'N/A').substring(0, 20).padEnd(20);
        const status = (idea.status || 'PENDING').substring(0, 8);
        output += `│ ${id.padEnd(36)} │ ${title} │ ${status.padEnd(7)} │\n`;
      });

      output += '└─────────────────────────────────────────────────────────────────────────┘\n';
      output += `✅ [SUCCESS] Command executed: super --fetch ideas\n✅ Total: ${ideas.length} ideas\n`;

      return {
        success: true,
        output,
        data: ideas,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `❌ Error fetching ideas: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }

  private static async listUsers(): Promise<CommandResult> {
    try {
      const response = await tuApiService.get('/admin/users'); // ✅ Uses JWT interceptor
      // Handle response format
      const users = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (!Array.isArray(users) || users.length === 0) {
        return {
          success: true,
          output: '✅ [SUCCESS] Command executed: super --list users\n✅ No users found',
          data: users,
        };
      }

      let output = '\n👥 USERS LIST:\n';
      output += '┌──────────────────────────────────────────────────────────────────────┐\n';
      output += '│ Email                          │ Role            │ Power │ Status  │\n';
      output += '├──────────────────────────────────────────────────────────────────────┤\n';

      users.forEach((user: any) => {
        const email = (user.email || 'N/A').substring(0, 30).padEnd(30);
        const role = (user.role || 'N/A').substring(0, 15).padEnd(15);
        const power = (user.power || 0).toString().padEnd(5);
        const status = user.is_active ? '✅ Active ' : '❌ Inactive';
        output += `│ ${email} │ ${role} │ ${power} │ ${status} │\n`;
      });

      output += '└──────────────────────────────────────────────────────────────────────┘\n';
      output += `✅ [SUCCESS] Command executed: super --list users\n✅ Total: ${users.length} users\n`;

      return {
        success: true,
        output,
        data: users,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `❌ Error fetching users: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }

  private static async deleteIdea(id: string): Promise<CommandResult> {
    try {
      await tuApiService.delete(`/ideas/${id}`); // ✅ Uses JWT interceptor
      return {
        success: true,
        output: `✅ [SUCCESS] Command executed: super --delete idea ${id}\nIdea "${id}" deleted successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `❌ Error deleting idea: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  private static async setPower(email: string, level: number): Promise<CommandResult> {
    try {
      if (level < 1 || level > 20) {
        return {
          success: false,
          output: '❌ Invalid power level. Must be between 1-20',
        };
      }

      await tuApiService.put(`/users/${email}/power`, { power: level }); // ✅ Uses JWT interceptor
      return {
        success: true,
        output: `✅ [SUCCESS] Command executed: super --set-power ${email} ${level}\nUser "${email}" power level set to ${level}`,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `❌ Error setting power: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  private static async getStats(): Promise<CommandResult> {
    try {
      const ideasRes = await tuApiService.get('/ideas'); // ✅ Uses JWT interceptor
      const usersRes = await tuApiService.get('/admin/users'); // ✅ Uses JWT interceptor

      // Handle response format
      const ideas = Array.isArray(ideasRes.data) ? ideasRes.data : (ideasRes.data?.data || []);
      const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

      const totalIdeas = Array.isArray(ideas) ? ideas.length : 0;
      const approvedIdeas = Array.isArray(ideas) ? ideas.filter((i: any) => i.status === 'Approved' || i.status === 'APPROVED').length : 0;
      const pendingIdeas = Array.isArray(ideas) ? ideas.filter((i: any) => i.status === 'Pending' || i.status === 'PENDING').length : 0;
      const totalUsers = Array.isArray(users) ? users.length : 0;

      let output = '✅ [SUCCESS] Command executed: super --stats\n';
      output += '\n📊 SYSTEM STATISTICS:\n';
      output += '┌────────────────────────────────────┐\n';
      output += `│ Total Ideas:        ${totalIdeas.toString().padStart(17)} │\n`;
      output += `│ Approved Ideas:     ${approvedIdeas.toString().padStart(17)} │\n`;
      output += `│ Pending Ideas:      ${pendingIdeas.toString().padStart(17)} │\n`;
      output += `│ Total Users:        ${totalUsers.toString().padStart(17)} │\n`;
      output += '└────────────────────────────────────┘\n';

      // Simple ASCII chart
      output += '\n📈 IDEAS STATUS BREAKDOWN:\n';
      const chartWidth = 30;
      const approvedPercent = totalIdeas > 0 ? (approvedIdeas / totalIdeas) * chartWidth : 0;
      output += '[' + '█'.repeat(Math.floor(approvedPercent)) + '░'.repeat(Math.floor(chartWidth - approvedPercent)) + `] ${approvedIdeas}/${totalIdeas}\n`;

      return {
        success: true,
        output,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `❌ Error fetching stats: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }
}
