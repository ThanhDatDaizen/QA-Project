/**
 * TypeScript type definitions for APIClient
 */

export interface ContributionData {
    id?: string;
    title: string;
    description: string;
    author: string;
    timestamp?: string;
    [key: string]: any;
}

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

declare class IntellectualContributionAPIClient {
    baseURL: string;
    
    constructor(baseURL?: string);
    
    request<T>(method: string, endpoint: string, data?: any): Promise<APIResponse<T>>;
    
    enrollIdentity(payload: any): Promise<any>;
    authenticatePrincipal(email: string, password: string): Promise<any>;
    getPrincipalProfile(): Promise<any>;
    acceptTerms(): Promise<any>;
    logout(): void;
    
    createContribution(payload: any): Promise<any>;
    listContributions(): Promise<any>;
    getContribution(id: string): Promise<any>;
    updateContribution(id: string, payload: any): Promise<any>;
    addAffirmativeMarker(id: string): Promise<any>;
    addNegativeMarker(id: string): Promise<any>;
    
    createDiscourse(contributionId: string, content: string): Promise<any>;
    listDiscourse(contributionId: string): Promise<any>;
    
    getDashboard(): Promise<any>;
    exportCSV(): Promise<any>;
    healthCheck(): Promise<any>;
}

export default IntellectualContributionAPIClient;
