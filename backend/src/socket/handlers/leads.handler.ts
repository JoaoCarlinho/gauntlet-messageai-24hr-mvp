import { Server, Socket } from 'socket.io';
import { Lead } from '@prisma/client';

type LeadStatus = string;

/**
 * Lead Socket Handler
 * Handles real-time notifications for lead events
 */

/**
 * Notify team members about a new lead
 */
export const notifyNewLead = (io: Server, teamId: string, lead: Lead) => {
  try {
    const roomName = `team_${teamId}`;

    io.to(roomName).emit('lead:new', {
      leadId: lead.id,
      lead,
      timestamp: new Date().toISOString(),
    });

    console.log(`Notified team ${teamId} about new lead ${lead.id}`);
  } catch (error) {
    console.error('Error notifying new lead:', error);
  }
};

/**
 * Notify team members that a lead was claimed
 */
export const notifyLeadClaimed = (
  io: Server,
  teamId: string,
  leadId: string,
  userId: string,
  userName: string
) => {
  try {
    const roomName = `team_${teamId}`;

    io.to(roomName).emit('lead:claimed', {
      leadId,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });

    console.log(`Notified team ${teamId} that lead ${leadId} was claimed by ${userName}`);
  } catch (error) {
    console.error('Error notifying lead claimed:', error);
  }
};

/**
 * Notify team members about lead status change
 */
export const notifyLeadStatusChanged = (
  io: Server,
  teamId: string,
  leadId: string,
  oldStatus: LeadStatus,
  newStatus: LeadStatus
) => {
  try {
    const roomName = `team_${teamId}`;

    io.to(roomName).emit('lead:status_changed', {
      leadId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });

    console.log(`Notified team ${teamId} about status change for lead ${leadId}: ${oldStatus} -> ${newStatus}`);
  } catch (error) {
    console.error('Error notifying lead status change:', error);
  }
};

/**
 * Notify team members about new lead activity
 */
export const notifyLeadActivity = (
  io: Server,
  teamId: string,
  leadId: string,
  activityType: string,
  description: string,
  userId: string
) => {
  try {
    const roomName = `team_${teamId}`;

    io.to(roomName).emit('lead:activity', {
      leadId,
      activityType,
      description,
      userId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Notified team ${teamId} about activity on lead ${leadId}`);
  } catch (error) {
    console.error('Error notifying lead activity:', error);
  }
};

/**
 * Join team room for lead notifications
 */
export const joinTeamRoom = (socket: Socket, teamId: string) => {
  try {
    const roomName = `team_${teamId}`;
    socket.join(roomName);

    console.log(`Socket ${socket.id} joined team room ${roomName}`);

    socket.emit('team:joined', {
      teamId,
      roomName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error joining team room:', error);
  }
};

/**
 * Leave team room
 */
export const leaveTeamRoom = (socket: Socket, teamId: string) => {
  try {
    const roomName = `team_${teamId}`;
    socket.leave(roomName);

    console.log(`Socket ${socket.id} left team room ${roomName}`);

    socket.emit('team:left', {
      teamId,
      roomName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error leaving team room:', error);
  }
};

/**
 * Initialize lead socket handlers
 */
export const initializeLeadHandlers = (io: Server, socket: Socket) => {
  // Handle team room joining
  socket.on('lead:join_team', (data: { teamId: string }) => {
    joinTeamRoom(socket, data.teamId);
  });

  // Handle team room leaving
  socket.on('lead:leave_team', (data: { teamId: string }) => {
    leaveTeamRoom(socket, data.teamId);
  });

  // Handle disconnect - leave all team rooms
  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected from lead handlers`);
  });
};

export default {
  notifyNewLead,
  notifyLeadClaimed,
  notifyLeadStatusChanged,
  notifyLeadActivity,
  joinTeamRoom,
  leaveTeamRoom,
  initializeLeadHandlers,
};
