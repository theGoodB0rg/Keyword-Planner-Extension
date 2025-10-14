declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
  }

  interface RelatedQueriesOptions {
    keyword: string | string[];
    geo?: string;
    hl?: string;
  }

  type InterestOverTimeResponse = string;

  const googleTrends: {
    interestOverTime(options: InterestOverTimeOptions): Promise<InterestOverTimeResponse>;
    relatedQueries(options: RelatedQueriesOptions): Promise<string>;
  };

  export = googleTrends;
}
