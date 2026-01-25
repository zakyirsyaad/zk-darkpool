pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";  // Path relatif yang benar dari sebelumnya

template DarkPoolTradeCheck() {
    signal input saldoBase;      
    signal input saldoQuote;     
    signal input amountBase;     
    signal input amountQuote;    

    signal input midpointPrice;  
    signal input toleranceBps;   

    signal output valid;         

    component geqBase = GreaterEqThan(252);
    geqBase.in[0] <== saldoBase;
    geqBase.in[1] <== amountBase;

    component geqQuote = GreaterEqThan(252);
    geqQuote.in[0] <== saldoQuote;
    geqQuote.in[1] <== amountQuote;

    // Price tolerance check (simplified absolute deviation approx)
    signal expectedQuote <== amountBase * midpointPrice;
    signal deviasi <== expectedQuote - amountQuote;
    signal absDeviasiSquared <== deviasi * deviasi;  // approx abs

    signal toleranceThreshold <== (midpointPrice * toleranceBps) / 10000;
    signal tolSquared <== toleranceThreshold * toleranceThreshold;

    component ltTol = LessEqThan(252);
    ltTol.in[0] <== absDeviasiSquared;
    ltTol.in[1] <== tolSquared;

    // Fixed AND logic with intermediate
    signal and1;
    and1 <== geqBase.out * geqQuote.out;

    valid <== and1 * ltTol.out;
}

component main {public [midpointPrice, toleranceBps, amountBase, amountQuote]} = DarkPoolTradeCheck();