import { Controller, Get, UseGuards } from '@nestjs/common';

import { SessionAuthGuard } from '../auth/session-auth.guard';

@Controller('/api')
export class DataController {
  @UseGuards(SessionAuthGuard)
  @Get('/data')
  getData() {
    return {
      items: [
        {
          id: 'task-1',
          title: 'Review OAuth login flow',
          status: 'completed',
        },
        {
          id: 'task-2',
          title: 'Validate protected API access',
          status: 'pending',
        },
      ],
    };
  }
}
