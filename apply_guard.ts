import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(__dirname, 'src');

function walkDir(dir: string, callback: (filepath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const excludedControllers = ['auth.controller.ts', 'subscriptions.controller.ts', 'users.controller.ts', 'app.controller.ts', 'seed.controller.ts', 'admin.controller.ts', 'dashboard.controller.ts', 'churches.controller.ts', 'profile.controller.ts', 'notifications.controller.ts'];

walkDir(srcDir, (filepath) => {
  if (filepath.endsWith('controller.ts')) {
    const filename = path.basename(filepath);
    if (excludedControllers.includes(filename)) {
        return;
    }

    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Check if we need to add import
    if (!content.includes('SubscriptionGuard')) {
      const lastImportMatch = content.match(/import .* from .*;(\n|\r\n|$)/g);
      if (lastImportMatch) {
         let lastImportStr = lastImportMatch[lastImportMatch.length - 1];
         let lastImportIndex = content.lastIndexOf(lastImportStr) + lastImportStr.length;
         
         const relativePath = path.relative(path.dirname(filepath), path.join(srcDir, 'subscriptions', 'guards', 'subscription.guard')).replace(/\\/g, '/');
         content = content.slice(0, lastImportIndex) + `\nimport { SubscriptionGuard } from '${relativePath}';` + content.slice(lastImportIndex);
      }
    }

    // 2. Add to UseGuards array
    if (content.match(/@UseGuards\([\s\S]*?\)/)) {
      if (!content.match(/@UseGuards\([\s\S]*?SubscriptionGuard[\s\S]*?\)/)) {
          content = content.replace(/(@UseGuards\([\s\S]*?)(\))/, '$1, SubscriptionGuard$2');
      }
    } else {
        const classMatch = content.match(/@Controller\([^)]*\)\s*export class/);
        if (classMatch) {
             let index = classMatch.index;
             if (index !== undefined) {
                 content = content.slice(0, index) + `@UseGuards(SubscriptionGuard)\n` + content.slice(index);
             }
        }
    }

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${filepath}`);
  }
});
