import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export interface RobotDescriptor {
  id: string;
  name: string;
  ip: string;
  rosbridgePort: number;
  videoPort: number;
  videoTopic: string;
}

// TODO: Replace this hardcoded list with a Prisma-backed `Robot` entity
// (id, name, ip, rosbridgePort, videoPort, videoTopic, ownerId, isOnline, ...)
// once the registry needs to be user-managed.
const HARDCODED_ROBOTS: RobotDescriptor[] = [
  {
    id: 'jetracer-01',
    name: 'Lab JetRacer',
    ip: '192.168.1.101',
    rosbridgePort: 9090,
    videoPort: 8080,
    videoTopic: '/csi_cam_0/image_raw',
  },
];

@Controller('robots')
@UseGuards(JwtAuthGuard)
export class RobotsController {
  @Get()
  list(): RobotDescriptor[] {
    return HARDCODED_ROBOTS;
  }
}
