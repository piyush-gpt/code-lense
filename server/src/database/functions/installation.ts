import { Installation } from '../../models/Installation.ts';

// Helper functions for Installation operations
export const createInstallation = async (data: any) => {
  try {
    const installation = new Installation(data);
    await installation.save();
    console.log('✅ Installation saved to database:', data.installationId);
    return installation;
  } catch (error) {
    console.error('❌ Failed to save installation:', error);
    throw error;
  }
};

export const findInstallationByAccountId = async (accountId: number) => {
  return await Installation.findOne({ accountId });
};

export const findInstallationByInstallationId = async (installationId: number) => {
  return await Installation.findOne({ installationId });
};

export const findInstallationByIdOrAccountId = async (installationId: number, accountId?: number) => {
  // First try to find by installation ID
  let installation = await Installation.findOne({ installationId });
  
  // If not found and accountId is provided, try to find by account ID
  if (!installation && accountId) {
    installation = await Installation.findOne({ accountId });
  }
  
  return installation;
};

export const getAllInstallations = async () => {
  return await Installation.find({});
};

export const deleteInstallation = async (installationId: number) => {
  try {
    await Installation.deleteOne({ installationId });
    console.log('✅ Installation deleted from database:', installationId);
  } catch (error) {
    console.error('❌ Failed to delete installation:', error);
    throw error;
  }
};

export const deleteInstallationByAccountId = async (accountId: number) => {
  try {
    await Installation.deleteOne({ accountId });
    console.log('✅ Installation deleted from database for account:', accountId);
  } catch (error) {
    console.error('❌ Failed to delete installation for account:', error);
    throw error;
  }
}; 