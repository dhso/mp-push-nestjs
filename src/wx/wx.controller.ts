import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ChannelService } from '../channel/channel.service';

const cmds = ['link', 'unlink', 'show'];
@Controller('wx')
export class WxController {
  constructor(private readonly userService: UserService, private readonly channelService: ChannelService) { }

  /**
   * 回显
   * https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1472017492_58YV5
   * @param query
   */
  @Get()
  echo(@Query() query) {
    Logger.verbose(query);
    // 懒得验签了
    return query.echostr;
  }

  /**
   * 接收普通消息
   * https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140453
   * @param body
   */
  @Post()
  async message(@Body() body) {
    Logger.verbose(body);
    if (body.xml.msgtype[0] !== 'text') { return; }
    const {
      tousername: [appid],
      fromusername: [openid],
      content: [content],
    } = body.xml;
    const [cmd, channelName] = content.trim().split(' ');
    switch (cmd) {
      case 'link': {
        return this.linkAction(openid, appid, channelName);
      }
      case 'unlink': {
        return this.unlinkAction(openid, appid, channelName);
      }
      case 'show': {
        return this.showAction(openid, appid);
      }
      default: {
        return this.noCmdAction(openid, appid);
      }
    }
  }

  async linkAction(openid, appid, channelName) {
    const user = await this.userService.login(openid);
    Logger.verbose(user);
    await this.channelService.linkChannel(channelName, user);
    return `<xml>
      <ToUserName><![CDATA[${openid}]]></ToUserName>
      <FromUserName><![CDATA[${appid}]]></FromUserName>
      <CreateTime>${Math.floor(+new Date() / 1000)}</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[您已订阅 ${channelName} 频道]]></Content>
    </xml>`;
  }

  async unlinkAction(openid, appid, channelName) {
    const user = await this.userService.login(openid);
    Logger.verbose(user);
    await this.channelService.unlinkChannel(channelName, user);
    return `<xml>
      <ToUserName><![CDATA[${openid}]]></ToUserName>
      <FromUserName><![CDATA[${appid}]]></FromUserName>
      <CreateTime>${Math.floor(+new Date() / 1000)}</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[您已取消订阅 ${channelName} 频道]]></Content>
    </xml>`;
  }

  async showAction(openid, appid) {
    const user = await this.userService.login(openid);
    Logger.verbose(user);
    const { followChannels } = await this.userService.fetch(user);
    Logger.verbose(followChannels);
    return `<xml>
      <ToUserName><![CDATA[${openid}]]></ToUserName>
      <FromUserName><![CDATA[${appid}]]></FromUserName>
      <CreateTime>${Math.floor(+new Date() / 1000)}</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[您已订阅如下频道:\n${followChannels.map(channel => channel.name).reverse().join('\n')}]]></Content>
    </xml>`;
  }

  async noCmdAction(openid, appid) {
    return `<xml>
        <ToUserName><![CDATA[${openid}]]></ToUserName>
        <FromUserName><![CDATA[${appid}]]></FromUserName>
        <CreateTime>${Math.floor(+new Date() / 1000)}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[目前仅支持 ${cmds.join(' ')} 命令。]]></Content>
    </xml>`;
  }
}
