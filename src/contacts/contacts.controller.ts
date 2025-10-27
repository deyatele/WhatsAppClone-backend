import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Список контактов пользователя' })
  async getContacts(@Req() req: any) {
    return this.contacts.findAllForUser(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: 'Контакт добавлен' })
  async addContact(@Req() req: any, @Body() body: CreateContactDto) {
    return this.contacts.addContact(req.user.userId, body.contactId);
  }
}
