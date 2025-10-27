import { Controller, Post, Get, Body, Param, UseGuards, Req, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Messages')
@ApiBearerAuth('access-token')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: 'Сообщение отправлено' })
  async sendMessage(@Req() req: any, @Body() dto: CreateMessageDto) {
    return this.messages.sendMessage(req.user.userId, dto);
  }

  @Get('chat/:chatId')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'chatId', type: String })
  @ApiResponse({ status: 200, description: 'Сообщения чата' })
  async getMessages(
    @Req() req: any, 
    @Param('chatId') chatId: string, 
    @Query() paginationDto: PaginationDto
  ) {
    return this.messages.getMessages(req.user.userId, chatId, paginationDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Список чатов пользователя' })
  async getUserChats(@Req() req: any) {
    return this.messages.getUserChats(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Одно сообщение по ID' })
  async findOne(@Param('id') id: string) {
    return this.messages.findOne(id);
  }

  
}
