import * as fs from 'fs';
import * as path from 'path';

const filesToClean = [
  path.join(__dirname, 'src', 'agenda', 'agenda.module.ts'),
  path.join(__dirname, 'src', 'treasury', 'treasury.module.ts')
];

filesToClean.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove imports
    content = content.replace(/import { SubscriptionsService } from 'src\/subscriptions\/subscriptions\.service';\r?\n?/g, '');
    content = content.replace(/import { Plan } from 'src\/subscriptions\/entities\/plan\.entity';\r?\n?/g, '');
    content = content.replace(/import { Subscription } from 'src\/subscriptions\/entities\/subscription\.entity';\r?\n?/g, '');
    content = content.replace(/import { Payment } from 'src\/subscriptions\/entities\/payment\.entity';\r?\n?/g, '');
    content = content.replace(/import { Church } from 'src\/churches\/entities\/church\.entity';\r?\n?/g, '');
    content = content.replace(/import { ChurchPerson } from 'src\/members\/entities\/church-person\.entity';\r?\n?/g, '');
    
    // Quick regex to remove from arrays, this is safer using simple string replacements 
    // since the user added them sequentially in the array
    
    content = content.replace(/,\s*Plan,\s*Subscription,\s*Payment,\s*Church,\s*ChurchPerson/g, '');
    content = content.replace(/,\s*Plan,\s*Subscription,\s*Payment,\s*Church/g, '');
    
    content = content.replace(/,\s*SubscriptionsService/g, '');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cleaned ${file}`);
  }
});
