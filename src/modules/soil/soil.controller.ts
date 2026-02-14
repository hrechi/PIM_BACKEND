import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SoilService } from './soil.service';
import { CreateSoilDto } from './dto/create-soil.dto';
import { UpdateSoilDto } from './dto/update-soil.dto';
import { QuerySoilDto } from './dto/query-soil.dto';

@ApiTags('Soil Measurements')
@Controller('soil')
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new soil measurement',
    description:
      'Creates a new soil measurement record with all required parameters including pH, moisture, nutrients, and location data.',
  })
  @ApiResponse({
    status: 201,
    description: 'Soil measurement successfully created',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 6.5,
        soilMoisture: 45.5,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T12:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input - validation failed',
  })
  create(@Body() createSoilDto: CreateSoilDto) {
    return this.soilService.create(createSoilDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all soil measurements',
    description:
      'Retrieves all soil measurements with support for pagination, filtering, and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of soil measurements with pagination metadata',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ph: 6.5,
            soilMoisture: 45.5,
            sunlight: 850.5,
            nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
            temperature: 22.5,
            latitude: 40.7128,
            longitude: -74.006,
            createdAt: '2026-02-14T12:00:00.000Z',
            updatedAt: '2026-02-14T12:00:00.000Z',
            phStatus: 'Neutral',
            moistureStatus: 'Optimal',
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
        },
      },
    },
  })
  findAll(@Query() query: QuerySoilDto) {
    return this.soilService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single soil measurement',
    description: 'Retrieves a specific soil measurement by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Soil measurement found',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 6.5,
        soilMoisture: 45.5,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T12:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  findOne(@Param('id') id: string) {
    return this.soilService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a soil measurement',
    description:
      'Updates an existing soil measurement. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Soil measurement successfully updated',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 7.0,
        soilMoisture: 50.0,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T13:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  update(@Param('id') id: string, @Body() updateSoilDto: UpdateSoilDto) {
    return this.soilService.update(id, updateSoilDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a soil measurement',
    description: 'Permanently deletes a soil measurement by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Soil measurement successfully deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  remove(@Param('id') id: string) {
    return this.soilService.remove(id);
  }
}
