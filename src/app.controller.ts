import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { WxService } from './wx/wx.service';
import { ConfigService } from './config/config.service';
import { ChannelService } from './channel/channel.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly wxService: WxService,
    private readonly configService: ConfigService,
    private readonly channelService: ChannelService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('push')
  async push(@Body() body) {
    Logger.verbose(body);
    const { channelName, text, templateId, templateData } = body;
    const isTemplateMsg = templateId && templateData;
    if (!channelName || !(text || isTemplateMsg)) {
      return {
        error: 1,
        message: 'Bad params!',
      };
    }
    const channel = await this.channelService.findByName(channelName);
    if (!channel) {
      return {
        error: 1,
        message: 'Channel not exist!',
      };
    }
    channel.subscribers.forEach(user => {
      let message = null;
      if (isTemplateMsg) {
        message = this.buildTemplateMsg(user, templateId, templateData);
      } else {
        message = this.buildSimpleMsg(user, text);
      }
      this.wxService.send(message);
    });

    return {
      error: 0,
      message: `Sending ${channel.subscribers.length} msg...`,
    };
  }

  buildSimpleMsg(user, text) {
    return {
      template_id: this.configService.WX_TEMPLATE_ID,
      touser: user.openid,
      data: {
        text: {
          value: text,
        },
      },
    };
  }

  buildTemplateMsg(user, templateId, templateData) {
    return {
      template_id: templateId,
      touser: user.openid,
      data: templateData,
    };
  }
}
